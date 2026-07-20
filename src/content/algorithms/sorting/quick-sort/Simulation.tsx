import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  SimulationControls,
  type SimulationSpeed,
} from "../../../../components/ui/SimulationControls";
import type { TraceableSimulationProps } from "../../../../lib/types";

type State = {
  array: number[];
  low: number;
  high: number;
  pivotIdx: number;
  i: number | null;
  j: number | null;
  swap?: [number, number];
  fixed: number[];
  partition: number;
  description: string;
};

/**
 * A deliberately small, deterministic Lomuto-partition walkthrough.  Each
 * frame corresponds one-to-one with quick-sort/trace.json, so the visual can
 * be driven either here (standalone) or by ConceptWorkbench (externalStep).
 */
const states: State[] = [
  {
    array: [7, 2, 9, 4, 1, 8, 3, 6],
    low: 0,
    high: 7,
    pivotIdx: 7,
    i: 0,
    j: null,
    fixed: [],
    partition: 1,
    description: "Choose the last value, 6, as the pivot for the full array.",
  },
  {
    array: [7, 2, 9, 4, 1, 8, 3, 6],
    low: 0,
    high: 7,
    pivotIdx: 7,
    i: 0,
    j: 0,
    fixed: [],
    partition: 1,
    description: "7 is greater than 6, so it stays on the pivot’s right side.",
  },
  {
    array: [2, 7, 9, 4, 1, 8, 3, 6],
    low: 0,
    high: 7,
    pivotIdx: 7,
    i: 1,
    j: 1,
    swap: [0, 1],
    fixed: [],
    partition: 1,
    description: "2 belongs left of 6. Swap it across the boundary and advance i.",
  },
  {
    array: [2, 7, 9, 4, 1, 8, 3, 6],
    low: 0,
    high: 7,
    pivotIdx: 7,
    i: 1,
    j: 2,
    fixed: [],
    partition: 1,
    description: "9 is greater than 6, so the left partition does not grow.",
  },
  {
    array: [2, 4, 9, 7, 1, 8, 3, 6],
    low: 0,
    high: 7,
    pivotIdx: 7,
    i: 2,
    j: 3,
    swap: [1, 3],
    fixed: [],
    partition: 1,
    description: "4 belongs left of 6. Move it behind the growing boundary.",
  },
  {
    array: [2, 4, 1, 7, 9, 8, 3, 6],
    low: 0,
    high: 7,
    pivotIdx: 7,
    i: 3,
    j: 4,
    swap: [2, 4],
    fixed: [],
    partition: 1,
    description: "1 belongs left of 6. Swap it into the left partition.",
  },
  {
    array: [2, 4, 1, 7, 9, 8, 3, 6],
    low: 0,
    high: 7,
    pivotIdx: 7,
    i: 3,
    j: 5,
    fixed: [],
    partition: 1,
    description: "8 is greater than 6, so it remains to the pivot’s right.",
  },
  {
    array: [2, 4, 1, 3, 9, 8, 7, 6],
    low: 0,
    high: 7,
    pivotIdx: 7,
    i: 4,
    j: 6,
    swap: [3, 6],
    fixed: [],
    partition: 1,
    description: "3 belongs left of 6. The left partition now ends at index 3.",
  },
  {
    array: [2, 4, 1, 3, 6, 8, 7, 9],
    low: 0,
    high: 7,
    pivotIdx: 4,
    i: 4,
    j: null,
    fixed: [4],
    partition: 1,
    description: "Swap the pivot into index 4. 6 has reached its final position.",
  },
  {
    array: [2, 4, 1, 3, 6, 8, 7, 9],
    low: 0,
    high: 3,
    pivotIdx: 3,
    i: 0,
    j: null,
    fixed: [4],
    partition: 2,
    description: "Recurse into the left side and choose 3 as its new pivot.",
  },
  {
    array: [2, 4, 1, 3, 6, 8, 7, 9],
    low: 0,
    high: 3,
    pivotIdx: 3,
    i: 1,
    j: 0,
    fixed: [4],
    partition: 2,
    description: "2 is already left of 3, so i advances without changing the array.",
  },
  {
    array: [2, 4, 1, 3, 6, 8, 7, 9],
    low: 0,
    high: 3,
    pivotIdx: 3,
    i: 1,
    j: 1,
    fixed: [4],
    partition: 2,
    description: "4 is greater than 3, so it waits on the pivot’s right side.",
  },
  {
    array: [2, 1, 4, 3, 6, 8, 7, 9],
    low: 0,
    high: 3,
    pivotIdx: 3,
    i: 2,
    j: 2,
    swap: [1, 2],
    fixed: [4],
    partition: 2,
    description: "1 belongs left of 3. Swap it with 4 and advance i.",
  },
  {
    array: [2, 1, 3, 4, 6, 8, 7, 9],
    low: 0,
    high: 3,
    pivotIdx: 2,
    i: 2,
    j: null,
    swap: [2, 3],
    fixed: [2, 3, 4],
    partition: 2,
    description: "Place 3 at index 2. Index 3 is now a one-value base case.",
  },
  {
    array: [2, 1, 3, 4, 6, 8, 7, 9],
    low: 0,
    high: 1,
    pivotIdx: 1,
    i: 0,
    j: null,
    fixed: [2, 3, 4],
    partition: 3,
    description: "Recurse into [2, 1] and choose 1 as the pivot.",
  },
  {
    array: [2, 1, 3, 4, 6, 8, 7, 9],
    low: 0,
    high: 1,
    pivotIdx: 1,
    i: 0,
    j: 0,
    fixed: [2, 3, 4],
    partition: 3,
    description: "2 is greater than 1, so it stays right of the pivot.",
  },
  {
    array: [1, 2, 3, 4, 6, 8, 7, 9],
    low: 0,
    high: 1,
    pivotIdx: 0,
    i: 0,
    j: null,
    swap: [0, 1],
    fixed: [0, 1, 2, 3, 4],
    partition: 3,
    description: "Place 1 at index 0. The entire left side is sorted.",
  },
  {
    array: [1, 2, 3, 4, 6, 8, 7, 9],
    low: 5,
    high: 7,
    pivotIdx: 7,
    i: 5,
    j: null,
    fixed: [0, 1, 2, 3, 4],
    partition: 4,
    description: "Return to the right side and choose 9 as the pivot.",
  },
  {
    array: [1, 2, 3, 4, 6, 8, 7, 9],
    low: 5,
    high: 7,
    pivotIdx: 7,
    i: 6,
    j: 5,
    fixed: [0, 1, 2, 3, 4],
    partition: 4,
    description: "8 is less than 9, so it remains in the left partition.",
  },
  {
    array: [1, 2, 3, 4, 6, 8, 7, 9],
    low: 5,
    high: 7,
    pivotIdx: 7,
    i: 7,
    j: 6,
    fixed: [0, 1, 2, 3, 4],
    partition: 4,
    description: "7 is also less than 9. Every value in this range stays left.",
  },
  {
    array: [1, 2, 3, 4, 6, 8, 7, 9],
    low: 5,
    high: 7,
    pivotIdx: 7,
    i: 7,
    j: null,
    fixed: [0, 1, 2, 3, 4, 7],
    partition: 4,
    description: "9 is already in its final position at the end of the array.",
  },
  {
    array: [1, 2, 3, 4, 6, 8, 7, 9],
    low: 5,
    high: 6,
    pivotIdx: 6,
    i: 5,
    j: null,
    fixed: [0, 1, 2, 3, 4, 7],
    partition: 5,
    description: "Only [8, 7] remains. Choose 7 as the final pivot.",
  },
  {
    array: [1, 2, 3, 4, 6, 8, 7, 9],
    low: 5,
    high: 6,
    pivotIdx: 6,
    i: 5,
    j: 5,
    fixed: [0, 1, 2, 3, 4, 7],
    partition: 5,
    description: "8 is greater than 7, so no value joins the left partition.",
  },
  {
    array: [1, 2, 3, 4, 6, 7, 8, 9],
    low: 5,
    high: 6,
    pivotIdx: 5,
    i: 5,
    j: null,
    swap: [5, 6],
    fixed: [0, 1, 2, 3, 4, 5, 6, 7],
    partition: 5,
    description: "Swap in 7. Every partition is complete and the array is sorted.",
  },
];

function markerFor(index: number, current: State) {
  if (current.swap?.includes(index)) return "swap";

  const markers: string[] = [];

  if (index === current.pivotIdx) markers.push("pivot");
  if (index === current.i) markers.push("i");
  if (index === current.j) markers.push("j");

  return markers.join(" · ");
}

function barColor(index: number, current: State) {
  if (index === current.pivotIdx) return "var(--accent-algorithms)";
  if (current.swap?.includes(index)) return "var(--success)";
  if (index === current.j) return "var(--warning)";
  if (index === current.i) return "var(--success)";
  if (current.fixed.includes(index)) {
    return "color-mix(in oklab, var(--accent-algorithms) 55%, var(--surface))";
  }

  return "color-mix(in oklab, var(--accent-algorithms) 68%, var(--surface))";
}

export default function QuickSortSimulation({
  externalStep,
}: TraceableSimulationProps = {}) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<SimulationSpeed>(1);

  useEffect(() => {
    if (!playing || externalStep !== undefined) return undefined;

    const id = window.setInterval(() => {
      setStep((currentStep) => {
        if (currentStep >= states.length - 1) {
          setPlaying(false);
          return currentStep;
        }

        return currentStep + 1;
      });
    }, 760 / speed);

    return () => window.clearInterval(id);
  }, [externalStep, playing, speed]);

  const currentStep = Math.max(0, Math.min(states.length - 1, externalStep ?? step));
  const current = states[currentStep];

  return (
    <div className="p-0">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Recursive partitions</h3>
          <p className="mt-1 max-w-2xl text-sm text-muted" aria-live="polite">
            {current.description}
          </p>
        </div>
        <span className="rounded-full bg-surface px-3 py-1 font-mono text-xs text-muted">
          partition {current.partition}/5
        </span>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[0.69rem] text-muted">
        <span>
          active range <strong className="font-medium text-foreground">[{current.low}…{current.high}]</strong>
        </span>
        <span>
          pivot <strong className="font-medium text-accent-algorithms">{current.array[current.pivotIdx]}</strong>
        </span>
        <span>
          boundary i <strong className="font-medium" style={{ color: "var(--success)" }}>{current.i ?? "—"}</strong>
        </span>
        <span>
          scan j <strong className="font-medium" style={{ color: "var(--warning)" }}>{current.j ?? "—"}</strong>
        </span>
      </div>

      <div className="flex h-[17.5rem] items-end justify-center gap-2 rounded-lg border border-border bg-surface/30 px-4 pb-4 pt-6 sm:gap-3">
        {current.array.map((value, index) => {
          const isInRange = index >= current.low && index <= current.high;
          const marker = markerFor(index, current);

          return (
            <motion.div
              key={index}
              layout
              className="flex min-w-0 flex-1 max-w-12 flex-col items-center justify-end gap-1.5"
              transition={{ type: "spring", stiffness: 280, damping: 24 }}
            >
              <span
                className="flex h-5 items-center justify-center whitespace-nowrap font-mono text-[0.58rem] uppercase tracking-[0.08em]"
                style={{
                  color:
                    index === current.pivotIdx
                      ? "var(--accent-algorithms)"
                      : current.swap?.includes(index)
                        ? "var(--success)"
                      : index === current.j
                        ? "var(--warning)"
                        : index === current.i
                          ? "var(--success)"
                          : "var(--foreground-muted)",
                  opacity: marker ? 1 : 0,
                }}
              >
                {marker || "marker"}
              </span>
              <span className="font-mono text-[0.6rem] text-muted">[{index}]</span>
              <motion.div
                animate={{
                  height: `${value * 17}px`,
                  opacity: isInRange ? 1 : 0.22,
                  scale: index === current.pivotIdx ? 1.04 : index === current.j ? 1.02 : 1,
                }}
                className="w-full rounded-t-md"
                style={{ backgroundColor: barColor(index, current) }}
                transition={{ type: "spring", stiffness: 280, damping: 24 }}
              />
              <span className="font-mono text-xs text-muted">{value}</span>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[0.65rem] text-muted">
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-accent-algorithms" />pivot</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "var(--success)" }} />partition boundary</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "var(--warning)" }} />current comparison</span>
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
