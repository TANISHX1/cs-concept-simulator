import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  SimulationControls,
  type SimulationSpeed,
} from "../../../../components/ui/SimulationControls";
import type { TraceableSimulationProps } from "../../../../lib/types";

type MergeState = {
  values: number[];
  activeIndexes: number[];
  ranges: Array<{ label: string; values: number[]; tone: "active" | "muted" }>;
  buffer: Array<number | null>;
  phase: string;
  description: string;
};

const states: MergeState[] = [
  {
    values: [8, 3, 6, 2, 7, 4, 1, 5],
    activeIndexes: [],
    ranges: [{ label: "whole range [0, 8)", values: [8, 3, 6, 2, 7, 4, 1, 5], tone: "active" }],
    buffer: [null, null, null, null, null, null, null, null],
    phase: "Start",
    description: "The full unsorted range is the first recursive call.",
  },
  {
    values: [8, 3, 6, 2, 7, 4, 1, 5],
    activeIndexes: [],
    ranges: [{ label: "base case check", values: [8, 3, 6, 2, 7, 4, 1, 5], tone: "active" }],
    buffer: [null, null, null, null, null, null, null, null],
    phase: "Check",
    description: "Eight values are not a base case, so the range must split.",
  },
  {
    values: [8, 3, 6, 2, 7, 4, 1, 5],
    activeIndexes: [3, 4],
    ranges: [
      { label: "left [0, 4)", values: [8, 3, 6, 2], tone: "active" },
      { label: "right [4, 8)", values: [7, 4, 1, 5], tone: "muted" },
    ],
    buffer: [null, null, null, null, null, null, null, null],
    phase: "Divide",
    description: "Find the middle at index 4 and create two independent subproblems.",
  },
  {
    values: [3, 8, 2, 6, 7, 4, 1, 5],
    activeIndexes: [0, 1, 2, 3],
    ranges: [
      { label: "sorted left [0, 4)", values: [3, 8, 2, 6], tone: "active" },
      { label: "right waits", values: [7, 4, 1, 5], tone: "muted" },
    ],
    buffer: [null, null, null, null, null, null, null, null],
    phase: "Recurse left",
    description: "Recursively sort the left half before it can be merged.",
  },
  {
    values: [3, 8, 2, 6, 7, 4, 1, 5],
    activeIndexes: [0, 1],
    ranges: [
      { label: "left pair [0, 2)", values: [3, 8], tone: "active" },
      { label: "right pair [2, 4)", values: [2, 6], tone: "muted" },
    ],
    buffer: [3, 8, null, null, null, null, null, null],
    phase: "Base cases",
    description: "Small sorted pieces return upward to their parent merge.",
  },
  {
    values: [3, 8, 2, 6, 1, 4, 5, 7],
    activeIndexes: [4, 5, 6, 7],
    ranges: [
      { label: "left sorted", values: [3, 8, 2, 6], tone: "muted" },
      { label: "sorted right [4, 8)", values: [1, 4, 5, 7], tone: "active" },
    ],
    buffer: [3, 8, 2, 6, null, null, null, null],
    phase: "Recurse right",
    description: "The right half returns sorted and is ready for the final merge.",
  },
  {
    values: [3, 8, 2, 6, 1, 4, 5, 7],
    activeIndexes: [0, 4],
    ranges: [
      { label: "left front", values: [3, 8, 2, 6], tone: "active" },
      { label: "right front", values: [1, 4, 5, 7], tone: "active" },
    ],
    buffer: [null, null, null, null, null, null, null, null],
    phase: "Compare",
    description: "Compare the first remaining values from both sorted halves.",
  },
  {
    values: [3, 8, 2, 6, 1, 4, 5, 7],
    activeIndexes: [4],
    ranges: [
      { label: "left remains", values: [3, 8, 2, 6], tone: "muted" },
      { label: "take 1", values: [1, 4, 5, 7], tone: "active" },
    ],
    buffer: [1, 2, null, null, null, null, null, null],
    phase: "Merge",
    description: "Copy the smaller front value to the temporary merge buffer.",
  },
  {
    values: [1, 2, 3, 4, 5, 6, 7, 8],
    activeIndexes: [0, 1, 2, 3, 4, 5, 6, 7],
    ranges: [{ label: "sorted range [0, 8)", values: [1, 2, 3, 4, 5, 6, 7, 8], tone: "active" }],
    buffer: [1, 2, 3, 4, 5, 6, 7, 8],
    phase: "Copy back",
    description: "The merged buffer replaces the original range in sorted order.",
  },
];

export default function MergeSortSimulation({
  externalStep,
}: TraceableSimulationProps = {}) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<SimulationSpeed>(1);

  useEffect(() => {
    if (!playing || externalStep !== undefined) return undefined;

    const intervalId = window.setInterval(() => {
      setStep((current) => {
        const next = Math.min(current + 1, states.length - 1);

        if (next === states.length - 1) setPlaying(false);
        return next;
      });
    }, 720 / speed);

    return () => window.clearInterval(intervalId);
  }, [externalStep, playing, speed]);

  const currentStep = Math.min(Math.max(externalStep ?? step, 0), states.length - 1);
  const current = states[currentStep];

  return (
    <div className="p-0">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.16em] text-accent-algorithms">
            {current.phase}
          </p>
          <h3 className="mt-1 text-lg font-semibold">Divide, sort, merge</h3>
          <p className="mt-1 max-w-md text-sm leading-relaxed text-muted">
            {current.description}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-background px-3 py-1 font-mono text-xs text-muted">
          pass {currentStep}/{states.length - 1}
        </span>
      </div>

      <div className="grid gap-4">
        <div className="flex min-h-[13.25rem] items-end justify-center gap-2 overflow-x-auto px-4 pb-4 pt-6">
          {current.values.map((value, index) => {
            const isActive = current.activeIndexes.includes(index);

            return (
              <motion.div
                key={`value-${value}`}
                layout
                className="flex w-[2.2rem] shrink-0 flex-col items-center gap-2"
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <motion.div
                  animate={{
                    height: `${Math.max(value * 15.4, 24)}px`,
                    opacity: isActive ? 1 : 0.55,
                    scale: isActive ? 1.06 : 1,
                  }}
                  className="w-full rounded-t-md bg-accent-algorithms"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
                <span className="font-mono text-xs text-muted">{value}</span>
              </motion.div>
            );
          })}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {current.ranges.map((range) => (
            <div
              key={range.label}
              className={`rounded-lg border px-3 py-2 ${range.tone === "active" ? "border-accent-algorithms/40 bg-accent-algorithms/10" : "border-border bg-background"}`}
            >
              <p className="font-mono text-[10px] uppercase tracking-[.12em] text-muted">
                {range.label}
              </p>
              <p className="mt-1 font-mono text-xs text-foreground">[{range.values.join(", ")}]</p>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-background px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[.12em] text-muted">
              Merge buffer
            </span>
            <span className="font-mono text-[10px] text-muted">temporary O(n) space</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {current.buffer.map((value, index) => (
              <span
                key={index}
                className={`grid h-6 min-w-6 place-items-center rounded font-mono text-[11px] ${value === null ? "border border-dashed border-border text-muted" : "bg-accent-algorithms/15 text-accent-algorithms"}`}
              >
                {value ?? "·"}
              </span>
            ))}
          </div>
        </div>
      </div>

      {externalStep === undefined ? (
        <SimulationControls
          isPlaying={playing}
          speed={speed}
          canStepBack={step > 0}
          canStepForward={step < states.length - 1}
          onPlayPause={() => setPlaying((current) => !current)}
          onStepBack={() => setStep((current) => Math.max(0, current - 1))}
          onStepForward={() => setStep((current) => Math.min(states.length - 1, current + 1))}
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
