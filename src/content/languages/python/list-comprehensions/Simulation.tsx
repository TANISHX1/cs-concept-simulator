import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  SimulationControls,
  type SimulationSpeed,
} from "../../../../components/ui/SimulationControls";

type SourceItem = {
  value: number;
  x: number;
  passed: boolean;
  transformed: number | null;
  appended: boolean;
};

type Step = {
  label: string;
  source: SourceItem[];
  result: number[];
  activeIndex: number | null;
  phase: "source" | "filter" | "transform" | "append" | "skip" | "done";
};

const SOURCE = [0, 1, 2, 3, 4, 5];

const STEPS: Step[] = [
  {
    label: "Initial source: range(6) = [0, 1, 2, 3, 4, 5]",
    source: SOURCE.map((v) => ({ value: v, x: v, passed: false, transformed: null, appended: false })),
    result: [],
    activeIndex: null,
    phase: "source",
  },
  {
    label: "x = 0: condition (0 % 2 == 0) → true, compute 0² = 0, append to result",
    source: SOURCE.map((v) => ({
      value: v,
      x: v,
      passed: v === 0 ? true : false,
      transformed: v === 0 ? 0 : null,
      appended: v === 0 ? true : false,
    })),
    result: [0],
    activeIndex: 0,
    phase: "append",
  },
  {
    label: "x = 1: condition (1 % 2 == 0) → false, skip",
    source: SOURCE.map((v) => ({
      value: v,
      x: v,
      passed: v < 2 ? v % 2 === 0 : false,
      transformed: v === 0 ? 0 : null,
      appended: v === 0 ? true : false,
    })),
    result: [0],
    activeIndex: 1,
    phase: "skip",
  },
  {
    label: "x = 2: condition true, compute 2² = 4, append → [0, 4]",
    source: SOURCE.map((v) => ({
      value: v,
      x: v,
      passed: v <= 2 ? v % 2 === 0 : false,
      transformed: v <= 2 && v % 2 === 0 ? v * v : null,
      appended: v <= 2 && v % 2 === 0 ? true : false,
    })),
    result: [0, 4],
    activeIndex: 2,
    phase: "append",
  },
  {
    label: "x = 3: condition false, skip",
    source: SOURCE.map((v) => ({
      value: v,
      x: v,
      passed: v <= 3 ? v % 2 === 0 : false,
      transformed: v <= 3 && v % 2 === 0 ? v * v : null,
      appended: v <= 3 && v % 2 === 0 ? true : false,
    })),
    result: [0, 4],
    activeIndex: 3,
    phase: "skip",
  },
  {
    label: "x = 4: condition true, compute 4² = 16, append → [0, 4, 16]",
    source: SOURCE.map((v) => ({
      value: v,
      x: v,
      passed: v <= 4 ? v % 2 === 0 : false,
      transformed: v <= 4 && v % 2 === 0 ? v * v : null,
      appended: v <= 4 && v % 2 === 0 ? true : false,
    })),
    result: [0, 4, 16],
    activeIndex: 4,
    phase: "append",
  },
  {
    label: "x = 5: condition false, skip",
    source: SOURCE.map((v) => ({
      value: v,
      x: v,
      passed: v % 2 === 0,
      transformed: v % 2 === 0 ? v * v : null,
      appended: v % 2 === 0 ? true : false,
    })),
    result: [0, 4, 16],
    activeIndex: 5,
    phase: "skip",
  },
  {
    label: "Final result: [0, 4, 16] ← [x**2 for x in range(6) if x % 2 == 0]",
    source: SOURCE.map((v) => ({
      value: v,
      x: v,
      passed: v % 2 === 0,
      transformed: v % 2 === 0 ? v * v : null,
      appended: v % 2 === 0 ? true : false,
    })),
    result: [0, 4, 16],
    activeIndex: null,
    phase: "done",
  },
];

export default function ListComprehensionsSimulation() {
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase text-accent-languages">Source list</h4>
          <div className="flex flex-wrap gap-2">
            {current.source.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  borderColor:
                    current.activeIndex === i
                      ? "var(--accent-languages)"
                      : item.passed
                        ? "var(--success)"
                        : "var(--border)",
                }}
                transition={{ duration: 0.25 }}
                className="flex flex-col items-center rounded-lg border-2 bg-background px-3 py-2"
                style={{
                  borderColor:
                    current.activeIndex === i
                      ? "var(--accent-languages)"
                      : item.passed
                        ? "var(--success)"
                        : "var(--border)",
                  background:
                    current.activeIndex === i
                      ? "color-mix(in oklab, var(--accent-languages) 10%, transparent)"
                      : item.appended
                        ? "color-mix(in oklab, var(--success) 10%, transparent)"
                        : "var(--background)",
                }}
              >
                <span className="font-mono text-sm text-foreground">{item.value}</span>
                <span className="font-mono text-[10px] text-muted">x={item.x}</span>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase" style={{ color: "var(--success)" }}>
            Result list
          </h4>
          <div className="flex flex-wrap gap-2">
            {current.result.map((val, i) => (
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
            {current.result.length === 0 && (
              <div className="py-3 text-center font-mono text-xs text-muted">(empty)</div>
            )}
          </div>
        </div>
      </div>
      {current.phase !== "source" && current.phase !== "done" && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-background p-2 text-center">
            <span className="font-mono text-[10px] text-muted">Filter (x % 2 == 0)</span>
            <div
              className="mt-1 font-mono text-xs"
              style={{
                color: current.activeIndex !== null && SOURCE[current.activeIndex] % 2 === 0
                  ? "var(--success)"
                  : "var(--error)",
              }}
            >
              {current.activeIndex !== null
                ? `${SOURCE[current.activeIndex]} % 2 == 0 → ${SOURCE[current.activeIndex] % 2 === 0 ? "true (pass)" : "false (skip)"}`
                : "—"}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-background p-2 text-center">
            <span className="font-mono text-[10px] text-muted">Transform (x**2)</span>
            <div className="mt-1 font-mono text-xs text-accent-languages">
              {current.activeIndex !== null && SOURCE[current.activeIndex] % 2 === 0
                ? `${SOURCE[current.activeIndex]}² = ${SOURCE[current.activeIndex] ** 2}`
                : "—"}
            </div>
          </div>
        </div>
      )}
      <div className="mt-3">
        <h4 className="mb-2 text-xs font-semibold uppercase text-muted">Comprehension</h4>
        <div className="rounded-lg bg-background px-3 py-2 font-mono text-sm text-foreground">
          <span style={{ color: "var(--accent-languages)" }}>[</span>x**2
          <span className="text-muted"> for x in </span>range(6)
          <span className="text-muted"> if </span>x % 2 == 0
          <span style={{ color: "var(--accent-languages)" }}>]</span>
          <span className="ml-2 text-muted">→ [{current.result.join(", ")}]</span>
        </div>
      </div>
      {current.phase === "done" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 rounded-lg border px-3 py-2 text-center font-mono text-xs"
          style={{ borderColor: "var(--success)", color: "var(--success)" }}
        >
          Comprehension complete: [x**2 for x in range(6) if x % 2 == 0] = [{current.result.join(", ")}]
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
