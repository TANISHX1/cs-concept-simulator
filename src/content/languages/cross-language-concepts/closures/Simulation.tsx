import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  SimulationControls,
  type SimulationSpeed,
} from "../../../../components/ui/SimulationControls";

type ScopeVar = {
  name: string;
  value: string;
  captured?: boolean;
};

type Scope = {
  name: string;
  vars: ScopeVar[];
  color: string;
  alive: boolean;
};

type Closure = {
  fnName: string;
  capturedVars: string[];
  alive: boolean;
};

type Step = {
  label: string;
  scopes: Scope[];
  closure?: Closure;
};

const STEPS: Step[] = [
  {
    label: "Global scope: declare outerFunction",
    scopes: [
      {
        name: "Global",
        vars: [{ name: "outerFunction", value: "<fn>" }],
        color: "var(--foreground-muted)",
        alive: true,
      },
    ],
  },
  {
    label: "Call outerFunction(): local scope created with 'message'",
    scopes: [
      {
        name: "Global",
        vars: [{ name: "outerFunction", value: "<fn>" }],
        color: "var(--foreground-muted)",
        alive: true,
      },
      {
        name: "outerFunction",
        vars: [{ name: "message", value: "\"Hello\"" }],
        color: "var(--accent-languages)",
        alive: true,
      },
    ],
  },
  {
    label: "Inner function declared: closure captures 'message'",
    scopes: [
      {
        name: "Global",
        vars: [{ name: "outerFunction", value: "<fn>" }],
        color: "var(--foreground-muted)",
        alive: true,
      },
      {
        name: "outerFunction",
        vars: [
          { name: "message", value: "\"Hello\"", captured: true },
          { name: "innerFunction", value: "<fn>" },
        ],
        color: "var(--accent-languages)",
        alive: true,
      },
    ],
    closure: { fnName: "innerFunction", capturedVars: ["message"], alive: true },
  },
  {
    label: "outerFunction() returns: scope destroyed, closure keeps 'message' alive",
    scopes: [
      {
        name: "Global",
        vars: [
          { name: "outerFunction", value: "<fn>" },
          { name: "innerFunction", value: "<fn>" },
        ],
        color: "var(--foreground-muted)",
        alive: true,
      },
    ],
    closure: { fnName: "innerFunction", capturedVars: ["message"], alive: true },
  },
  {
    label: "Call innerFunction(): accesses captured 'message'",
    scopes: [
      {
        name: "Global",
        vars: [
          { name: "outerFunction", value: "<fn>" },
          { name: "innerFunction", value: "<fn>" },
        ],
        color: "var(--foreground-muted)",
        alive: true,
      },
      {
        name: "innerFunction (closure)",
        vars: [{ name: "message", value: "\"Hello\"", captured: true }],
        color: "var(--accent-languages)",
        alive: true,
      },
    ],
    closure: { fnName: "innerFunction", capturedVars: ["message"], alive: true },
  },
];

export default function ClosuresSimulation() {
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
    }, 1000 / speed);
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
      <div className="flex flex-col gap-3">
        {current.scopes.map((scope, i) => (
          <motion.div
            key={scope.name}
            initial={{ opacity: 0, y: -10 }}
            animate={{
              opacity: scope.alive ? 1 : 0.3,
              y: 0,
              borderColor: scope.alive ? scope.color : "var(--border)",
            }}
            transition={{ duration: 0.35 }}
            className="rounded-xl border-2 bg-surface p-4"
            style={{ borderColor: scope.color }}
          >
            <div className="mb-2 flex items-center gap-2">
              <span
                className="rounded px-2 font-mono text-xs font-bold"
                style={{ background: scope.color, color: "var(--background)" }}
              >
                {scope.name}
              </span>
              {!scope.alive && (
                <span className="font-mono text-xs" style={{ color: "var(--error)" }}>
                  (destroyed)
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {scope.vars.map((v) => (
                <div
                  key={v.name}
                  className="rounded-lg border bg-background px-2 py-1"
                  style={{
                    borderColor: v.captured ? "var(--accent-languages)" : "var(--border)",
                  }}
                >
                  <span className="font-mono text-xs text-foreground">
                    {v.name}
                  </span>
                  <span className="ml-1 font-mono text-xs text-muted">
                    = {v.value}
                  </span>
                  {v.captured && (
                    <span
                      className="ml-1.5 rounded px-1 font-mono text-[10px]"
                      style={{
                        background: "var(--accent-languages)",
                        color: "var(--background)",
                      }}
                    >
                      captured
                    </span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
        {current.closure && current.closure.alive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="rounded-xl border-2 p-4"
            style={{ borderColor: "var(--accent-languages)" }}
          >
            <div className="mb-2">
              <span
                className="rounded px-2 font-mono text-xs font-bold"
                style={{
                  background: "var(--accent-languages)",
                  color: "var(--background)",
                }}
              >
                Closure
              </span>
            </div>
            <div className="flex flex-wrap gap-4">
              <div>
                <span className="font-mono text-xs text-muted">function:</span>
                <span className="ml-1 font-mono text-sm text-foreground">
                  {current.closure.fnName}
                </span>
              </div>
              <div>
                <span className="font-mono text-xs text-muted">captured:</span>
                {current.closure.capturedVars.map((v) => (
                  <span
                    key={v}
                    className="ml-1 rounded px-1 font-mono text-xs"
                    style={{
                      background: "var(--accent-languages)",
                      color: "var(--background)",
                    }}
                  >
                    {v}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
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