import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  SimulationControls,
  type SimulationSpeed,
} from "../../../../components/ui/SimulationControls";
import type { TraceableSimulationProps } from "../../../../lib/types";

type State = {
  low: number;
  high: number;
  mid: number | null;
  phase: string;
  description: string;
  status: "ready" | "probing" | "too-small" | "too-large" | "found";
};

const arr = [2, 4, 6, 8, 10, 12, 14, 16];
const target = 10;

const states: State[] = [
  {
    low: 0,
    high: 7,
    mid: null,
    phase: "Start with the complete range",
    description: "The sorted array gives us one safe search window: indexes 0 through 7.",
    status: "ready",
  },
  {
    low: 0,
    high: 7,
    mid: 3,
    phase: "Probe the middle",
    description: "middle = 3, so inspect array[3] = 8.",
    status: "probing",
  },
  {
    low: 0,
    high: 7,
    mid: 3,
    phase: "Compare 10 with 8",
    description: "10 is greater than 8, so every value through index 3 is too small.",
    status: "too-small",
  },
  {
    low: 4,
    high: 7,
    mid: null,
    phase: "Discard the lower half",
    description: "Move low to 4. Only indexes 4 through 7 can still contain 10.",
    status: "ready",
  },
  {
    low: 4,
    high: 7,
    mid: 5,
    phase: "Probe the new middle",
    description: "middle = 5, so inspect array[5] = 12.",
    status: "probing",
  },
  {
    low: 4,
    high: 7,
    mid: 5,
    phase: "Compare 10 with 12",
    description: "10 is smaller than 12, so every value from index 5 onward is too large.",
    status: "too-large",
  },
  {
    low: 4,
    high: 4,
    mid: null,
    phase: "Discard the upper half",
    description: "Move high to 4. One candidate remains in the search window.",
    status: "ready",
  },
  {
    low: 4,
    high: 4,
    mid: 4,
    phase: "Probe the final candidate",
    description: "middle = 4, so inspect array[4] = 10.",
    status: "probing",
  },
  {
    low: 4,
    high: 4,
    mid: 4,
    phase: "Target found",
    description: "array[4] equals 10. Return index 4.",
    status: "found",
  },
];

function markerNames(index: number, state: State) {
  const markers = [];

  if (index === state.low) markers.push("low");
  if (state.mid === index) markers.push("middle");
  if (index === state.high) markers.push("high");

  return markers;
}

function cellColor(state: State, isMiddle: boolean, isFound: boolean) {
  if (isFound) return "var(--success)";
  if (!isMiddle) return "var(--accent-algorithms)";
  if (state.status === "too-small") return "var(--warning)";
  if (state.status === "too-large") return "var(--error)";
  return "var(--accent-algorithms)";
}

export default function BinarySearchSimulation({
  externalStep,
}: TraceableSimulationProps = {}) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<SimulationSpeed>(1);

  useEffect(() => {
    if (!playing || externalStep !== undefined) return;
    const id = setInterval(
      () =>
        setStep((s) => {
          if (s >= states.length - 1) {
            setPlaying(false);
            return s;
          }
          return s + 1;
        }),
      700 / speed,
    );
    return () => clearInterval(id);
  }, [externalStep, playing, speed]);

  const currentStep = Math.max(0, Math.min(states.length - 1, externalStep ?? step));
  const current = states[currentStep];

  return (
    <div className="p-0">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="text-lg font-semibold">Find {target} in a sorted array</h3>
            <span
              className="rounded-full border px-2.5 py-1 font-mono text-[0.66rem] uppercase tracking-[0.12em]"
              style={{
                borderColor: "color-mix(in oklab, var(--accent-algorithms) 40%, var(--border))",
                color: "var(--accent-algorithms)",
              }}
            >
              O(log n)
            </span>
          </div>
          <p className="mt-1 text-sm font-medium text-foreground">{current.phase}</p>
          <p className="mt-1 max-w-xl text-sm text-muted" aria-live="polite">
            {current.description}
          </p>
        </div>
        <span className="rounded-full border border-border bg-background px-3 py-1 font-mono text-xs text-muted">
          range [{current.low}…{current.high}]
        </span>
      </div>

      <div className="rounded-xl border border-border bg-surface/30 px-3 py-5 sm:px-5">
        <div className="mb-4 flex items-center justify-between font-mono text-[0.64rem] uppercase tracking-[0.14em] text-muted">
          <span>Search window</span>
          <span>target = {target}</span>
        </div>
        <div className="grid grid-cols-8 gap-2 sm:gap-3">
        {arr.map((v, idx) => {
          const inRange = idx >= current.low && idx <= current.high;
          const isMid = idx === current.mid;
          const isFound = current.status === "found" && isMid;
          const markers = markerNames(idx, current);
          const label = markers.join(" · ");

          return (
            <div key={idx} className="min-w-0">
              <div className="mb-2 flex h-4 items-center justify-center">
                {label ? (
                <motion.span
                  key={label}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="whitespace-nowrap font-mono text-[0.58rem] uppercase tracking-[0.08em]"
                  style={{
                    color: isFound ? "var(--success)" : isMid ? cellColor(current, true, false) : "var(--foreground-muted)",
                  }}
                >
                  {isFound ? "found" : label}
                </motion.span>
                ) : null}
              </div>
              <motion.div
                layout
                animate={{
                  opacity: isFound ? 1 : inRange ? 1 : 0.2,
                  scale: isFound ? 1.05 : isMid ? 1.025 : 1,
                  y: isFound ? -3 : 0,
                }}
                className="flex aspect-square w-full items-center justify-center rounded-lg border font-mono text-sm font-semibold sm:text-base"
                style={{
                  backgroundColor: `color-mix(in oklab, ${cellColor(current, isMid, isFound)} ${isMid || isFound ? "27%" : "12%"}, var(--surface))`,
                  borderColor: isMid || isFound
                    ? cellColor(current, isMid, isFound)
                    : "var(--border)",
                  color: isMid || isFound ? cellColor(current, isMid, isFound) : "var(--foreground)",
                  boxShadow: isMid || isFound
                    ? `0 0 0 1px color-mix(in oklab, ${cellColor(current, isMid, isFound)} 28%, transparent), 0 12px 24px color-mix(in oklab, ${cellColor(current, isMid, isFound)} 18%, transparent)`
                    : "none",
                }}
                transition={{ type: "spring", stiffness: 280, damping: 24 }}
              >
                {v}
              </motion.div>
              <p className="mt-2 text-center font-mono text-[0.62rem] text-muted">[{idx}]</p>
            </div>
          );
        })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="font-mono uppercase tracking-[0.12em]">Rule</span>
        <span>Compare the target with the middle, then keep only the half that can still contain it.</span>
      </div>
      {externalStep === undefined ? (
        <SimulationControls
          isPlaying={playing}
          speed={speed}
          canStepBack={step > 0}
          canStepForward={step < states.length - 1}
          onPlayPause={() => setPlaying((currentPlaying) => !currentPlaying)}
          onStepBack={() => setStep((currentStep) => Math.max(0, currentStep - 1))}
          onStepForward={() =>
            setStep((currentStep) => Math.min(states.length - 1, currentStep + 1))
          }
          onReset={() => {
            setStep(0);
            setPlaying(false);
          }}
          onSpeedChange={setSpeed}
        />
      ) : null}
    </div>
  );
}
