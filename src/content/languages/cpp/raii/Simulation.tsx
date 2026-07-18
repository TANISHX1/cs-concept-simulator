import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  SimulationControls,
  type SimulationSpeed,
} from "../../../../components/ui/SimulationControls";

type StackObj = {
  id: string;
  label: string;
  type: "raw" | "unique" | "shared";
  active: boolean;
  refCount?: number;
};

type HeapObj = {
  id: string;
  label: string;
  value: string;
  ownerId: string | null;
  sharedOwners: string[];
  active: boolean;
};

type Step = {
  label: string;
  stack: StackObj[];
  heap: HeapObj[];
  warning?: string;
};

const STEPS: Step[] = [
  {
    label: "Raw new/delete — manual management, easy to leak",
    stack: [
      { id: "raw_p", label: "int* p", type: "raw", active: true },
    ],
    heap: [
      { id: "h1", label: "int", value: "42", ownerId: "raw_p", sharedOwners: [], active: true },
    ],
    warning: "Manual delete required — leak risk on exception paths",
  },
  {
    label: "unique_ptr<int> p = make_unique<int>(42) — RAII wrapper owns heap",
    stack: [
      { id: "up", label: "p (unique_ptr)", type: "unique", active: true },
    ],
    heap: [
      { id: "h2", label: "int", value: "42", ownerId: "up", sharedOwners: [], active: true },
    ],
  },
  {
    label: "Scope exit → ~unique_ptr() fires, heap freed automatically",
    stack: [],
    heap: [
      { id: "h2_freed", label: "int (freed)", value: "", ownerId: null, sharedOwners: [], active: false },
    ],
  },
  {
    label: "unique_ptr<int> p2 = move(p) — ownership transfers",
    stack: [
      { id: "up", label: "p (null)", type: "unique", active: false },
      { id: "up2", label: "p2 (unique_ptr)", type: "unique", active: true },
    ],
    heap: [
      { id: "h3", label: "int", value: "42", ownerId: "up2", sharedOwners: [], active: true },
    ],
  },
  {
    label: "shared_ptr<int> sp = make_shared<int>(10) — ref count = 1",
    stack: [
      { id: "sp", label: "sp (shared_ptr)", type: "shared", active: true, refCount: 1 },
    ],
    heap: [
      { id: "h4", label: "int", value: "10", ownerId: "sp", sharedOwners: ["sp"], active: true },
    ],
  },
  {
    label: "shared_ptr<int> sp2 = sp — copy increases ref count to 2",
    stack: [
      { id: "sp", label: "sp (shared_ptr)", type: "shared", active: true, refCount: 2 },
      { id: "sp2", label: "sp2 (shared_ptr)", type: "shared", active: true, refCount: 2 },
    ],
    heap: [
      { id: "h4", label: "int", value: "10", ownerId: "sp", sharedOwners: ["sp", "sp2"], active: true },
    ],
  },
  {
    label: "sp.reset() — ref count drops to 1",
    stack: [
      { id: "sp", label: "sp (null)", type: "shared", active: false, refCount: 0 },
      { id: "sp2", label: "sp2 (shared_ptr)", type: "shared", active: true, refCount: 1 },
    ],
    heap: [
      { id: "h4", label: "int", value: "10", ownerId: "sp2", sharedOwners: ["sp2"], active: true },
    ],
  },
  {
    label: "sp2 goes out of scope → ref count = 0 → heap freed",
    stack: [],
    heap: [
      { id: "h4_freed", label: "int (freed)", value: "", ownerId: null, sharedOwners: [], active: false },
    ],
  },
];

const STACK_TYPE_STYLE: Record<string, { bg: string; border: string }> = {
  raw: { bg: "color-mix(in oklab, var(--warning) 12%, transparent)", border: "var(--warning)" },
  unique: { bg: "color-mix(in oklab, var(--accent-languages) 12%, transparent)", border: "var(--accent-languages)" },
  shared: { bg: "color-mix(in oklab, var(--success) 12%, transparent)", border: "var(--success)" },
};

export default function RaiiSimulation() {
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
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-surface p-3">
          <h4 className="mb-3 text-xs font-semibold uppercase text-accent-languages">
            Stack
          </h4>
          <div className="flex flex-col gap-2">
            {current.stack.map((obj) => {
              const style = STACK_TYPE_STYLE[obj.type];
              return (
                <motion.div
                  key={obj.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: obj.active ? 1 : 0.4, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-xl border-2 p-3"
                  style={{ borderColor: style.border, background: style.bg }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-foreground">{obj.label}</span>
                    <span
                      className="rounded px-1 font-mono text-[10px]"
                      style={{ background: style.border, color: "var(--background)" }}
                    >
                      {obj.type === "raw" ? "raw ptr" : obj.type === "unique" ? "unique" : "shared"}
                    </span>
                    {obj.refCount !== undefined && obj.refCount > 0 && (
                      <span
                        className="ml-auto rounded-full px-2 font-mono text-[10px]"
                        style={{
                          background: "color-mix(in oklab, var(--success) 20%, transparent)",
                          color: "var(--success)",
                          border: "1px solid var(--success)",
                        }}
                      >
                        ref count: {obj.refCount}
                      </span>
                    )}
                  </div>
                  {!obj.active && (
                    <div className="mt-1 font-mono text-[10px] text-muted">(null / destroyed)</div>
                  )}
                </motion.div>
              );
            })}
            {current.stack.length === 0 && (
              <div className="py-4 text-center font-mono text-xs text-muted">(stack empty)</div>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <h4 className="mb-3 text-xs font-semibold uppercase" style={{ color: "var(--success)" }}>
            Heap
          </h4>
          <div className="flex flex-col gap-2">
            {current.heap.map((obj) => (
              <motion.div
                key={obj.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: obj.active ? 1 : 0.3, y: 0 }}
                transition={{ duration: 0.3 }}
                className="rounded-xl border-2 p-3"
                style={{
                  borderColor: obj.active ? "var(--success)" : "var(--border)",
                  background: obj.active
                    ? "color-mix(in oklab, var(--success) 10%, transparent)"
                    : "var(--surface)",
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-foreground">{obj.label}</span>
                  {obj.value && <span className="font-mono text-xs text-muted">= {obj.value}</span>}
                </div>
                {obj.sharedOwners.length > 1 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {obj.sharedOwners.map((owner) => (
                      <span
                        key={owner}
                        className="rounded px-1 font-mono text-[10px]"
                        style={{
                          background: "color-mix(in oklab, var(--accent-languages) 15%, transparent)",
                          color: "var(--accent-languages)",
                        }}
                      >
                        {owner}
                      </span>
                    ))}
                  </div>
                )}
                {!obj.active && (
                  <div className="mt-1 font-mono text-[10px]" style={{ color: "var(--error)" }}>
                    memory freed
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      {current.warning && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 rounded-lg border px-3 py-2 text-center font-mono text-xs"
          style={{ borderColor: "var(--warning)", color: "var(--warning)" }}
        >
          {current.warning}
        </motion.div>
      )}
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