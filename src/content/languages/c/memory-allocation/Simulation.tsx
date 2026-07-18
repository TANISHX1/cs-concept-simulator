import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  SimulationControls,
  type SimulationSpeed,
} from "../../../../components/ui/SimulationControls";

type HeapBlock = {
  id: string;
  label: string;
  size: number;
  status: "allocated" | "freed" | "zero-init" | "realloc";
  values: number[];
  address: string;
};

type Step = {
  label: string;
  blocks: HeapBlock[];
  pointerInfo: { name: string; address: string; active: boolean }[];
};

const STEPS: Step[] = [
  {
    label: 'int *p = malloc(4 * sizeof(int)) — allocate block for 4 ints',
    blocks: [
      { id: "b1", label: "p", size: 16, status: "allocated", values: [], address: "0x1000" },
    ],
    pointerInfo: [{ name: "p", address: "0x1000", active: true }],
  },
  {
    label: 'p[0] = 10; p[1] = 20; — fill values into the block',
    blocks: [
      { id: "b1", label: "p", size: 16, status: "allocated", values: [10, 20], address: "0x1000" },
    ],
    pointerInfo: [{ name: "p", address: "0x1000", active: true }],
  },
  {
    label: 'int *q = malloc(8 * sizeof(int)) — another allocation',
    blocks: [
      { id: "b1", label: "p", size: 16, status: "allocated", values: [10, 20], address: "0x1000" },
      { id: "b2", label: "q", size: 32, status: "allocated", values: [], address: "0x2000" },
    ],
    pointerInfo: [
      { name: "p", address: "0x1000", active: true },
      { name: "q", address: "0x2000", active: true },
    ],
  },
  {
    label: 'free(p) — block freed, p is now a dangling pointer',
    blocks: [
      { id: "b1", label: "p (DANGLING)", size: 16, status: "freed", values: [], address: "0x1000" },
      { id: "b2", label: "q", size: 32, status: "allocated", values: [], address: "0x2000" },
    ],
    pointerInfo: [
      { name: "p", address: "0x1000", active: false },
      { name: "q", address: "0x2000", active: true },
    ],
  },
  {
    label: 'p = NULL — pointer set to null, dangling risk avoided',
    blocks: [
      { id: "b1", label: "p (freed)", size: 16, status: "freed", values: [], address: "0x1000" },
      { id: "b2", label: "q", size: 32, status: "allocated", values: [], address: "0x2000" },
    ],
    pointerInfo: [
      { name: "p", address: "NULL", active: false },
      { name: "q", address: "0x2000", active: true },
    ],
  },
  {
    label: 'int *r = calloc(5, sizeof(int)) — zero-initialized allocation',
    blocks: [
      { id: "b1", label: "p (freed)", size: 16, status: "freed", values: [], address: "0x1000" },
      { id: "b2", label: "q", size: 32, status: "allocated", values: [], address: "0x2000" },
      { id: "b3", label: "r (calloc)", size: 20, status: "zero-init", values: [0, 0, 0, 0, 0], address: "0x3000" },
    ],
    pointerInfo: [
      { name: "p", address: "NULL", active: false },
      { name: "q", address: "0x2000", active: true },
      { name: "r", address: "0x3000", active: true },
    ],
  },
  {
    label: 'r = realloc(r, 10 * sizeof(int)) — reallocate to larger block',
    blocks: [
      { id: "b1", label: "p (freed)", size: 16, status: "freed", values: [], address: "0x1000" },
      { id: "b2", label: "q", size: 32, status: "allocated", values: [], address: "0x2000" },
      { id: "b4", label: "r (realloc)", size: 40, status: "realloc", values: [0, 0, 0, 0, 0], address: "0x4000" },
    ],
    pointerInfo: [
      { name: "p", address: "NULL", active: false },
      { name: "q", address: "0x2000", active: true },
      { name: "r", address: "0x4000", active: true },
    ],
  },
];

const STATUS_STYLE: Record<string, { bg: string; border: string }> = {
  allocated: { bg: "color-mix(in oklab, var(--accent-languages) 15%, transparent)", border: "var(--accent-languages)" },
  freed: { bg: "color-mix(in oklab, var(--error) 15%, transparent)", border: "var(--error)" },
  "zero-init": { bg: "color-mix(in oklab, var(--success) 15%, transparent)", border: "var(--success)" },
  realloc: { bg: "color-mix(in oklab, var(--accent-languages) 15%, transparent)", border: "var(--accent-languages)" },
};

export default function MemoryAllocationSimulation() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<SimulationSpeed>(1);

  const current = STEPS[step];
  const maxStep = STEPS.length - 1;

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setStep((s) => {
        if (s >= maxStep) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 1100 / speed);
    return () => clearInterval(id);
  }, [playing, speed, maxStep]);

  return (
    <div className="p-0">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{current.label}</h3>
        <span className="rounded-full bg-background px-3 py-1 font-mono text-xs text-muted">
          step {step + 1}/{STEPS.length}
        </span>
      </div>
      <div className="mb-4 rounded-xl border border-border bg-surface p-3">
        <h4 className="mb-3 text-xs font-semibold uppercase text-accent-languages">
          Heap Memory
        </h4>
        <div className="flex flex-wrap gap-3">
          {current.blocks.map((block) => {
            const style = STATUS_STYLE[block.status];
            return (
              <motion.div
                key={block.id}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35 }}
                className="flex flex-col rounded-xl border-2 p-3"
                style={{ borderColor: style.border, background: style.bg }}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded px-1.5 font-mono text-xs font-bold" style={{ background: style.border, color: "var(--background)" }}>
                    {block.label}
                  </span>
                  <span className="font-mono text-[10px] text-muted">{block.size}B</span>
                </div>
                <div className="font-mono text-[10px] text-muted">{block.address}</div>
                {block.values.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {block.values.map((v, i) => (
                      <span key={i} className="rounded bg-background px-1 font-mono text-[10px] text-foreground">
                        [{i}]={v}
                      </span>
                    ))}
                  </div>
                )}
                {block.status === "zero-init" && (
                  <div className="mt-1 font-mono text-[10px]" style={{ color: "var(--success)" }}>
                    zero-initialized
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
      <div className="rounded-xl border border-border bg-surface p-3">
        <h4 className="mb-2 text-xs font-semibold uppercase text-muted">Pointers</h4>
        <div className="flex flex-wrap gap-3">
          {current.pointerInfo.map((ptr) => (
            <motion.div
              key={ptr.name}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 rounded-lg border bg-background px-2.5 py-1.5"
              style={{
                borderColor: ptr.active ? "var(--accent-languages)" : "var(--border)",
                opacity: ptr.active ? 1 : 0.5,
              }}
            >
              <span className="font-mono text-xs text-foreground">{ptr.name}</span>
              <span className="font-mono text-[10px] text-muted">→</span>
              <span
                className="rounded px-1.5 font-mono text-[10px]"
                style={{
                  background: ptr.active ? "color-mix(in oklab, var(--accent-languages) 15%, transparent)" : "var(--surface)",
                  color: ptr.active ? "var(--accent-languages)" : "var(--foreground-muted)",
                }}
              >
                {ptr.address}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
      <SimulationControls
        isPlaying={playing}
        speed={speed}
        canStepBack={step > 0}
        canStepForward={step < maxStep}
        onPlayPause={() => setPlaying((p) => !p)}
        onStepBack={() => setStep((s) => Math.max(0, s - 1))}
        onStepForward={() => setStep((s) => Math.min(maxStep, s + 1))}
        onReset={() => { setStep(0); setPlaying(false); }}
        onSpeedChange={setSpeed}
      />
    </div>
  );
}