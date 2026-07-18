import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  SimulationControls,
  type SimulationSpeed,
} from "../../../../components/ui/SimulationControls";

type StackFrame = {
  id: string;
  name: string;
  type: "sync" | "async";
  active: boolean;
};

type QueueItem = {
  id: string;
  label: string;
  type: "micro" | "macro";
};

type Phase = "synchronous" | "await-suspended" | "queues-filled" | "event-loop-micro" | "event-loop-macro";

type Step = {
  label: string;
  stack: StackFrame[];
  microQueue: QueueItem[];
  macroQueue: QueueItem[];
  phase: Phase;
};

const STEPS: Step[] = [
  {
    label: "Synchronous code runs: main() on stack",
    stack: [{ id: "main", name: "main()", type: "sync", active: true }],
    microQueue: [],
    macroQueue: [],
    phase: "synchronous",
  },
  {
    label: "asyncFunc() called: pushed on stack",
    stack: [
      { id: "main", name: "main()", type: "sync", active: true },
      { id: "asyncFunc", name: "asyncFunc()", type: "async", active: true },
    ],
    microQueue: [],
    macroQueue: [],
    phase: "synchronous",
  },
  {
    label: "await fetch(): asyncFunc suspends, pushed to microtask queue",
    stack: [
      { id: "main", name: "main()", type: "sync", active: true },
    ],
    microQueue: [
      { id: "mq1", label: "asyncFunc() resumed", type: "micro" },
    ],
    macroQueue: [],
    phase: "await-suspended",
  },
  {
    label: "setTimeout() callback registered → macrotask queue",
    stack: [
      { id: "main", name: "main()", type: "sync", active: true },
    ],
    microQueue: [
      { id: "mq1", label: "asyncFunc() resumed", type: "micro" },
    ],
    macroQueue: [
      { id: "M1", label: "setTimeout cb", type: "macro" },
    ],
    phase: "queues-filled",
  },
  {
    label: "Main code finishes: stack empty",
    stack: [],
    microQueue: [
      { id: "mq1", label: "asyncFunc() resumed", type: "micro" },
    ],
    macroQueue: [
      { id: "M1", label: "setTimeout cb", type: "macro" },
    ],
    phase: "queues-filled",
  },
  {
    label: "Event loop picks microtask: asyncFunc() resumes",
    stack: [
      { id: "asyncFunc", name: "asyncFunc()", type: "async", active: true },
    ],
    microQueue: [],
    macroQueue: [
      { id: "M1", label: "setTimeout cb", type: "macro" },
    ],
    phase: "event-loop-micro",
  },
  {
    label: "asyncFunc() completes, event loop picks macrotask",
    stack: [
      { id: "timeoutCb", name: "setTimeout cb", type: "sync", active: true },
    ],
    microQueue: [],
    macroQueue: [],
    phase: "event-loop-macro",
  },
];

const PHASE_COLORS: Record<Phase, string> = {
  synchronous: "var(--accent-languages)",
  "await-suspended": "var(--warning)",
  "queues-filled": "var(--foreground-muted)",
  "event-loop-micro": "var(--success)",
  "event-loop-macro": "var(--accent-languages)",
};

export default function AsyncAwaitSimulation() {
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
      <div className="mb-3 flex items-center gap-2">
        <span className="font-mono text-xs text-muted">Phase:</span>
        <span
          className="rounded px-2 font-mono text-xs font-bold"
          style={{ background: PHASE_COLORS[current.phase], color: "var(--background)" }}
        >
          {current.phase.replace(/-/g, " ")}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-surface p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase text-accent-languages">
            Call Stack
          </h4>
          <div className="flex flex-col-reverse gap-1">
            {current.stack.map((frame) => (
              <motion.div
                key={frame.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.25 }}
                className="rounded-lg border px-2 py-1.5"
                style={{
                  borderColor: frame.type === "async" ? "var(--accent-languages)" : "var(--border)",
                  background: frame.active
                    ? frame.type === "async"
                      ? "color-mix(in oklab, var(--accent-languages) 12%, transparent)"
                      : "var(--surface)"
                    : "var(--surface)",
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: frame.active ? "var(--success)" : "var(--foreground-muted)",
                    }}
                  />
                  <span className="font-mono text-xs text-foreground">{frame.name}</span>
                  {frame.type === "async" && (
                    <span
                      className="ml-auto rounded px-1 font-mono text-[10px]"
                      style={{ background: "var(--accent-languages)", color: "var(--background)" }}
                    >
                      async
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
            {current.stack.length === 0 && (
              <div className="py-3 text-center font-mono text-xs text-muted">(empty)</div>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase" style={{ color: "var(--success)" }}>
            Microtask Queue
          </h4>
          <div className="flex flex-col gap-1">
            {current.microQueue.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="rounded-lg border px-2 py-1.5"
                style={{ borderColor: "var(--success)" }}
              >
                <span className="font-mono text-xs text-foreground">{item.label}</span>
              </motion.div>
            ))}
            {current.microQueue.length === 0 && (
              <div className="py-3 text-center font-mono text-xs text-muted">(empty)</div>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase" style={{ color: "var(--warning)" }}>
            Macrotask Queue
          </h4>
          <div className="flex flex-col gap-1">
            {current.macroQueue.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="rounded-lg border px-2 py-1.5"
                style={{ borderColor: "var(--warning)" }}
              >
                <span className="font-mono text-xs text-foreground">{item.label}</span>
              </motion.div>
            ))}
            {current.macroQueue.length === 0 && (
              <div className="py-3 text-center font-mono text-xs text-muted">(empty)</div>
            )}
          </div>
        </div>
      </div>
      {current.phase === "await-suspended" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 rounded-lg border px-3 py-2 text-center font-mono text-xs"
          style={{ borderColor: "var(--warning)", color: "var(--warning)" }}
        >
          await suspension: async frame moved to microtask queue, stack unwound
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
        onReset={() => {
          setStep(0);
          setPlaying(false);
        }}
        onSpeedChange={setSpeed}
      />
    </div>
  );
}