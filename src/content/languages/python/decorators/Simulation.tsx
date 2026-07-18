import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  SimulationControls,
  type SimulationSpeed,
} from "../../../../components/ui/SimulationControls";

type Wrapper = {
  name: string;
  depth: number;
};

type Step = {
  label: string;
  wrappers: Wrapper[];
  callFlow: string[];
  callPhase: "define" | "wrap" | "call" | "return";
  activeArrow: number | null;
};

const STEPS: Step[] = [
  {
    label: "1. Define base function: def fetch_data()",
    wrappers: [{ name: "fetch_data", depth: 0 }],
    callFlow: [],
    callPhase: "define",
    activeArrow: null,
  },
  {
    label: "2. Define @log decorator — wraps fetch_data to add logging",
    wrappers: [
      { name: "log_wrapper", depth: 1 },
      { name: "fetch_data", depth: 0 },
    ],
    callFlow: [],
    callPhase: "wrap",
    activeArrow: null,
  },
  {
    label: "3. @log applied: fetch_data = log(fetch_data)",
    wrappers: [
      { name: "log_wrapper", depth: 1 },
      { name: "fetch_data", depth: 0 },
    ],
    callFlow: [],
    callPhase: "wrap",
    activeArrow: null,
  },
  {
    label: "4. Define @timer decorator — measures execution time",
    wrappers: [
      { name: "timer_wrapper", depth: 2 },
      { name: "log_wrapper", depth: 1 },
      { name: "fetch_data", depth: 0 },
    ],
    callFlow: [],
    callPhase: "wrap",
    activeArrow: null,
  },
  {
    label: "5. @timer @log applied: fetch_data = timer(log(fetch_data))",
    wrappers: [
      { name: "timer_wrapper", depth: 2 },
      { name: "log_wrapper", depth: 1 },
      { name: "fetch_data", depth: 0 },
    ],
    callFlow: [],
    callPhase: "wrap",
    activeArrow: null,
  },
  {
    label: "6. Call fetch_data() → enters timer_wrapper",
    wrappers: [
      { name: "timer_wrapper", depth: 2 },
      { name: "log_wrapper", depth: 1 },
      { name: "fetch_data", depth: 0 },
    ],
    callFlow: ["timer_wrapper"],
    callPhase: "call",
    activeArrow: 0,
  },
  {
    label: "7. timer_wrapper calls → log_wrapper",
    wrappers: [
      { name: "timer_wrapper", depth: 2 },
      { name: "log_wrapper", depth: 1 },
      { name: "fetch_data", depth: 0 },
    ],
    callFlow: ["timer_wrapper", "log_wrapper"],
    callPhase: "call",
    activeArrow: 1,
  },
  {
    label: "8. log_wrapper calls original fetch_data()",
    wrappers: [
      { name: "timer_wrapper", depth: 2 },
      { name: "log_wrapper", depth: 1 },
      { name: "fetch_data", depth: 0 },
    ],
    callFlow: ["timer_wrapper", "log_wrapper", "fetch_data"],
    callPhase: "call",
    activeArrow: 2,
  },
  {
    label: "9. fetch_data returns → log_wrapper logs exit",
    wrappers: [
      { name: "timer_wrapper", depth: 2 },
      { name: "log_wrapper", depth: 1 },
      { name: "fetch_data", depth: 0 },
    ],
    callFlow: ["timer_wrapper", "log_wrapper", "fetch_data"],
    callPhase: "return",
    activeArrow: 2,
  },
  {
    label: "10. log_wrapper returns → timer_wrapper logs timing",
    wrappers: [
      { name: "timer_wrapper", depth: 2 },
      { name: "log_wrapper", depth: 1 },
      { name: "fetch_data", depth: 0 },
    ],
    callFlow: ["timer_wrapper", "log_wrapper"],
    callPhase: "return",
    activeArrow: 1,
  },
  {
    label: "11. timer_wrapper returns final result",
    wrappers: [
      { name: "timer_wrapper", depth: 2 },
      { name: "log_wrapper", depth: 1 },
      { name: "fetch_data", depth: 0 },
    ],
    callFlow: ["timer_wrapper"],
    callPhase: "return",
    activeArrow: 0,
  },
];

export default function DecoratorsSimulation() {
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
          <h4 className="mb-2 text-xs font-semibold uppercase text-accent-languages">Decorator chain</h4>
          <div className="flex flex-col gap-1.5">
            {current.wrappers.map((w, i) => (
              <motion.div
                key={w.name}
                initial={{ opacity: 0, x: 20 }}
                animate={{
                  opacity: 1,
                  x: 0,
                  borderColor: i === current.wrappers.length - 1 ? "var(--success)" : "var(--accent-languages)",
                }}
                transition={{ duration: 0.3, delay: i * 0.08 }}
                className="flex items-center gap-2 rounded-lg border-2 px-3 py-2"
                style={{
                  borderColor: i === current.wrappers.length - 1 ? "var(--success)" : "var(--accent-languages)",
                  background:
                    current.callFlow.includes(w.name)
                      ? "color-mix(in oklab, var(--accent-languages) 15%, transparent)"
                      : "var(--background)",
                  marginLeft: `${w.depth * 20}px`,
                }}
              >
                {i < current.wrappers.length - 1 && (
                  <span
                    className="rounded px-1 font-mono text-[10px]"
                    style={{ background: "var(--accent-languages)", color: "var(--background)" }}
                  >
                    @decorator
                  </span>
                )}
                <span className="font-mono text-xs text-foreground">{w.name}</span>
                {current.callFlow.includes(w.name) && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="ml-auto font-mono text-[10px]"
                    style={{ color: "var(--success)" }}
                  >
                    {current.callPhase === "call" ? "→ entering" : "← returning"}
                  </motion.span>
                )}
              </motion.div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase" style={{ color: "var(--success)" }}>
            Call flow
          </h4>
          <div className="flex flex-col gap-1">
            {current.callFlow.length > 0 ? (
              current.callFlow.map((name, i) => (
                <motion.div
                  key={`${name}-${i}`}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.1 }}
                  className="flex items-center gap-2 rounded-lg px-2 py-1"
                  style={{
                    background: "color-mix(in oklab, var(--accent-languages) 10%, transparent)",
                    borderLeft: `3px solid var(--accent-languages)`,
                  }}
                >
                  <span className="font-mono text-xs text-foreground">
                    {current.callPhase === "call" ? "→" : "←"} {name}
                  </span>
                </motion.div>
              ))
            ) : (
              <div className="py-3 text-center font-mono text-xs text-muted">(not yet called)</div>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3">
        <h4 className="mb-2 text-xs font-semibold uppercase text-muted">Definition</h4>
        <div className="rounded-lg bg-background px-3 py-2 font-mono text-xs text-foreground">
          <span style={{ color: "var(--accent-languages)" }}>@timer</span>{"\n"}
          <span style={{ color: "var(--accent-languages)" }}>@log</span>{"\n"}
          <span style={{ color: "var(--success)" }}>def</span> fetch_data():{"\n"}
          {"    "}...
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
