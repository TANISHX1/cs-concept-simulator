import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  SimulationControls,
  type SimulationSpeed,
} from "../../../../components/ui/SimulationControls";

type FuncBlock = {
  id: string;
  name: string;
  address: string;
  signature: string;
};

type PtrVar = {
  name: string;
  type: string;
  targetId: string | null;
};

type Step = {
  label: string;
  functions: FuncBlock[];
  pointers: PtrVar[];
  result?: string;
};

const FUNCTIONS: FuncBlock[] = [
  { id: "add", name: "add", address: "0x4010", signature: "int add(int, int)" },
  { id: "sub", name: "subtract", address: "0x4020", signature: "int subtract(int, int)" },
  { id: "mul", name: "multiply", address: "0x4030", signature: "int multiply(int, int)" },
];

const STEPS: Step[] = [
  {
    label: "Three functions defined at different code addresses",
    functions: FUNCTIONS,
    pointers: [],
  },
  {
    label: "Declare function pointer: int (*op)(int, int) — an address-sized box",
    functions: FUNCTIONS,
    pointers: [{ name: "op", type: "int (*)(int, int)", targetId: null }],
  },
  {
    label: "op = &add — op now points to add's code",
    functions: FUNCTIONS,
    pointers: [{ name: "op", type: "int (*)(int, int)", targetId: "add" }],
  },
  {
    label: "result = op(3, 4) → calls add(3, 4) = 7",
    functions: FUNCTIONS,
    pointers: [{ name: "op", type: "int (*)(int, int)", targetId: "add" }],
    result: "result = 7",
  },
  {
    label: "op = &subtract — pointer retargeted",
    functions: FUNCTIONS,
    pointers: [{ name: "op", type: "int (*)(int, int)", targetId: "sub" }],
  },
  {
    label: "result = op(10, 3) → calls subtract(10, 3) = 7",
    functions: FUNCTIONS,
    pointers: [{ name: "op", type: "int (*)(int, int)", targetId: "sub" }],
    result: "result = 7",
  },
  {
    label: "typedef int (*BinaryOp)(int, int) — function pointer type alias",
    functions: FUNCTIONS,
    pointers: [{ name: "BinaryOp", type: "typedef int (*)(int, int)", targetId: null }],
  },
  {
    label: "BinaryOp ops[3] = {add, subtract, multiply} — dispatch table",
    functions: FUNCTIONS,
    pointers: [
      { name: "ops[0]", type: "BinaryOp", targetId: "add" },
      { name: "ops[1]", type: "BinaryOp", targetId: "sub" },
      { name: "ops[2]", type: "BinaryOp", targetId: "mul" },
    ],
  },
];

export default function FunctionPointersSimulation() {
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

  const getFuncAddr = (id: string) => FUNCTIONS.find((f) => f.id === id);

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
          Code Segment
        </h4>
        <div className="flex flex-wrap gap-3">
          {current.functions.map((fn) => {
            const isTarget = current.pointers.some((p) => p.targetId === fn.id);
            return (
              <motion.div
                key={fn.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="relative rounded-xl border-2 p-3"
                style={{
                  borderColor: isTarget ? "var(--accent-languages)" : "var(--border)",
                  background: isTarget
                    ? "color-mix(in oklab, var(--accent-languages) 10%, var(--code-surface))"
                    : "var(--code-surface)",
                }}
              >
                <div className="mb-1 font-mono text-xs text-foreground">{fn.name}</div>
                <div className="font-mono text-[10px] text-muted">{fn.signature}</div>
                <div className="mt-1 rounded bg-background px-1.5 py-0.5 font-mono text-[10px]" style={{ color: "var(--accent-languages)" }}>
                  {fn.address}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      <div className="rounded-xl border border-border bg-surface p-3">
        <h4 className="mb-2 text-xs font-semibold uppercase text-muted">Pointers</h4>
        <div className="flex flex-wrap items-center gap-3">
          {current.pointers.map((ptr) => {
            const target = ptr.targetId ? getFuncAddr(ptr.targetId) : null;
            return (
              <motion.div
                key={ptr.name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2"
                style={{
                  borderColor: ptr.targetId ? "var(--accent-languages)" : "var(--border)",
                }}
              >
                <div className="flex flex-col">
                  <span className="font-mono text-xs text-foreground">{ptr.name}</span>
                  <span className="font-mono text-[10px] text-muted">{ptr.type}</span>
                </div>
                {target ? (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    className="flex items-center gap-1.5"
                  >
                    <span className="text-muted">→</span>
                    <span
                      className="rounded px-1.5 font-mono text-[10px]"
                      style={{
                        background: "color-mix(in oklab, var(--accent-languages) 15%, transparent)",
                        color: "var(--accent-languages)",
                      }}
                    >
                      {target.name} ({target.address})
                    </span>
                  </motion.div>
                ) : (
                  <span className="rounded bg-surface px-1.5 font-mono text-[10px] text-muted">
                    uninitialized
                  </span>
                )}
              </motion.div>
            );
          })}
          {current.pointers.length === 0 && (
            <div className="py-2 font-mono text-xs text-muted">(no pointers declared)</div>
          )}
        </div>
      </div>
      {current.result && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 rounded-lg border px-3 py-2 text-center font-mono text-sm"
          style={{ borderColor: "var(--success)", color: "var(--success)" }}
        >
          {current.result}
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