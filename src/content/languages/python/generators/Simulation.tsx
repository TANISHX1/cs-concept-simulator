import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  SimulationControls,
  type SimulationSpeed,
} from "../../../../components/ui/SimulationControls";

type GenState = {
  a: number;
  b: number;
  status: "suspended" | "running" | "done";
  yielded: number | null;
};

type Step = {
  label: string;
  action: string;
  state: GenState;
  produced: number[];
  phase: "define" | "call" | "next" | "loop" | "done";
};

const STEPS: Step[] = [
  {
    label: "Define generator: def fibonacci(): a, b = 0, 1; while True: yield a; a, b = b, a+b",
    action: "Generator function defined. Calling it returns a generator object.",
    state: { a: 0, b: 1, status: "suspended", yielded: null },
    produced: [],
    phase: "define",
  },
  {
    label: "g = fib() → generator object created, suspended at start",
    action: "Generator object created. No code executed yet.",
    state: { a: 0, b: 1, status: "suspended", yielded: null },
    produced: [],
    phase: "call",
  },
  {
    label: "next(g) → resumes, executes until yield a → yields 0",
    action: "a = 0, yield a → produces 0. State saved: a=0, b=1, suspended at yield.",
    state: { a: 0, b: 1, status: "suspended", yielded: 0 },
    produced: [0],
    phase: "next",
  },
  {
    label: "next(g) → resumes, a,b = 1,1, yields 1",
    action: "After yield: a, b = b, a+b → a=1, b=1. yield a → produces 1.",
    state: { a: 1, b: 1, status: "suspended", yielded: 1 },
    produced: [0, 1],
    phase: "next",
  },
  {
    label: "next(g) → yields 1",
    action: "a, b = 1, 2 → a=1, b=2. yield a → produces 1.",
    state: { a: 1, b: 2, status: "suspended", yielded: 1 },
    produced: [0, 1, 1],
    phase: "next",
  },
  {
    label: "next(g) → yields 2",
    action: "a, b = 2, 3 → a=2, b=3. yield a → produces 2.",
    state: { a: 2, b: 3, status: "suspended", yielded: 2 },
    produced: [0, 1, 1, 2],
    phase: "next",
  },
  {
    label: "next(g) → yields 3",
    action: "a, b = 3, 5 → a=3, b=5. yield a → produces 3.",
    state: { a: 3, b: 5, status: "suspended", yielded: 3 },
    produced: [0, 1, 1, 2, 3],
    phase: "next",
  },
  {
    label: "For-loop: for x in fib(): if x > 5: break",
    action: "Iterating lazily with a for-loop. Generator produces values on demand, then we stop.",
    state: { a: 3, b: 5, status: "done", yielded: null },
    produced: [0, 1, 1, 2, 3],
    phase: "loop",
  },
];

export default function GeneratorsSimulation() {
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
    }, 1200 / speed);
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase text-accent-languages">Generator state</h4>
          <div className="rounded-lg border-2 bg-background px-3 py-3"
            style={{
              borderColor:
                current.state.status === "running"
                  ? "var(--accent-languages)"
                  : current.state.status === "done"
                    ? "var(--foreground-muted)"
                    : "var(--border)",
            }}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="font-mono text-xs text-muted">status:</span>
              <span
                className="rounded px-1.5 font-mono text-xs font-bold"
                style={{
                  background:
                    current.state.status === "suspended"
                      ? "var(--warning)"
                      : current.state.status === "running"
                        ? "var(--accent-languages)"
                        : "var(--foreground-muted)",
                  color: "var(--background)",
                }}
              >
                {current.state.status}
              </span>
            </div>
            <div className="flex gap-4">
              <div>
                <span className="font-mono text-[10px] text-muted">a</span>
                <div className="font-mono text-sm text-foreground">{current.state.a}</div>
              </div>
              <div>
                <span className="font-mono text-[10px] text-muted">b</span>
                <div className="font-mono text-sm text-foreground">{current.state.b}</div>
              </div>
              {current.state.yielded !== null && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <span className="font-mono text-[10px] text-muted">yielded</span>
                  <div className="font-mono text-lg font-bold" style={{ color: "var(--success)" }}>
                    {current.state.yielded}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
          <div className="mt-2 rounded-lg bg-background px-2 py-1 font-mono text-[10px] text-muted">
            {current.action}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase" style={{ color: "var(--success)" }}>
            Produced values (lazy)
          </h4>
          <div className="flex flex-wrap gap-2">
            {current.produced.map((val, i) => (
              <motion.div
                key={`${i}-${val}`}
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="rounded-lg border-2 px-3 py-1.5"
                style={{
                  borderColor: "var(--success)",
                  background: "color-mix(in oklab, var(--success) 12%, transparent)",
                }}
              >
                <span className="font-mono text-sm text-foreground">{val}</span>
              </motion.div>
            ))}
            {current.produced.length === 0 && (
              <div className="py-3 text-center font-mono text-xs text-muted">(no values yet)</div>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3">
        <h4 className="mb-2 text-xs font-semibold uppercase text-muted">Generator function</h4>
        <div className="rounded-lg bg-background px-3 py-2 font-mono text-xs text-foreground">
          <span style={{ color: "var(--accent-languages)" }}>def</span> fibonacci():{"\n"}
          {"    "}a, b = 0, 1{"\n"}
          {"    "}<span style={{ color: "var(--success)" }}>while</span> True:{"\n"}
          {"        "}<span style={{ color: "var(--success)" }}>yield</span> a{"\n"}
          {"        "}a, b = b, a + b
        </div>
      </div>
      {current.phase === "loop" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 rounded-lg border px-3 py-2 text-center font-mono text-xs"
          style={{ borderColor: "var(--warning)", color: "var(--warning)" }}
        >
          Eager list would compute infinitely; generator produces values one at a time on demand
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
