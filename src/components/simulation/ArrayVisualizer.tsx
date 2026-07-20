import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  SimulationControls,
  type SimulationSpeed,
} from "../ui/SimulationControls";
import type { SimulationSpec } from "../../lib/simulationSpec";
import { useRequiredActiveSimulation } from "./ActiveSimulationContext";

type ArraySimulationSpec = Extract<
  SimulationSpec,
  { visualType: "array" }
>;

export type ArrayVisualizerProps = {
  spec: ArraySimulationSpec;
};

type ArrayItem = {
  id: string;
  value: number;
};

type VisualState = {
  items: ArrayItem[];
  activeIndices: number[];
};

function getVisualState(
  spec: ArraySimulationSpec,
  currentStep: number,
): VisualState {
  const items = spec.initialState.map((value, index) => ({
    id: `item-${index}`,
    value,
  }));
  let activeIndices: number[] = [];

  for (const step of spec.steps.slice(0, currentStep)) {
    switch (step.type) {
      case "SWAP": {
        const [firstIndex, secondIndex] = step.indices;
        [items[firstIndex], items[secondIndex]] = [
          items[secondIndex],
          items[firstIndex],
        ];
        activeIndices = step.indices;
        break;
      }
      case "COMPARE":
        activeIndices = step.indices;
        break;
      case "HIGHLIGHT":
        activeIndices = step.indices;
        break;
    }
  }

  return { items, activeIndices };
}

export function ArrayVisualizer({ spec }: ArrayVisualizerProps) {
  const {
    conceptId,
    currentStep,
    setStep,
    isPlaying,
    setIsPlaying,
    setGroundingContext,
  } =
    useRequiredActiveSimulation();
  const [speed, setSpeed] = useState<SimulationSpeed>(1);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isPlaying) return;

    const intervalId = window.setInterval(() => {
      setStep((current) => {
        const next = Math.min(current + 1, spec.steps.length);

        if (next === spec.steps.length) {
          setIsPlaying(false);
        }

        return next;
      });
    }, 650 / speed);

    return () => window.clearInterval(intervalId);
  }, [isPlaying, setIsPlaying, setStep, speed, spec.steps.length]);

  const { items, activeIndices } = useMemo(
    () => getVisualState(spec, currentStep),
    [currentStep, spec],
  );
  const largestValue = Math.max(
    1,
    ...items.map((item) => Math.abs(item.value)),
  );

  const stepBack = () => setStep((current) => Math.max(0, current - 1));
  const stepForward = () =>
    setStep((current) => Math.min(spec.steps.length, current + 1));
  const reset = () => {
    setStep(0);
    setIsPlaying(false);
  };
  const transition = prefersReducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 280, damping: 24 };
  const selectBar = (index: number, value: number) => {
    setGroundingContext({
      conceptId,
      currentStep,
      stateSnapshot: {
        visualType: "array",
        selectedBar: { index, value },
        values: items.map((item) => item.value),
        activeIndices,
      },
    });
  };

  return (
    <div className="p-0">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{spec.title}</h3>
          <p className="text-sm text-muted">Array operations</p>
        </div>
        <span className="shrink-0 rounded-full bg-background px-3 py-1 font-mono text-xs text-muted">
          step {currentStep}/{spec.steps.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="flex h-52 min-w-max items-end justify-center gap-2 p-6">
          {items.map((item, index) => {
            const isActive = activeIndices.includes(index);
            const height = Math.max(
              12,
              Math.round((Math.abs(item.value) / largestValue) * 144),
            );

            return (
              <motion.div
                key={item.id}
                layout
                role="button"
                tabIndex={0}
                aria-label={`Select array value ${item.value} at index ${index}`}
                onClick={() => selectBar(index, item.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    selectBar(index, item.value);
                  }
                }}
                className="flex w-8 cursor-pointer flex-col items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accent-algorithms"
                transition={transition}
              >
                <motion.div
                  animate={{
                    height: `${height}px`,
                    opacity: isActive ? 1 : 0.6,
                    scale: isActive ? 1.06 : 1,
                  }}
                  className={`w-full rounded-t-md ${
                    isActive
                      ? "bg-accent-algorithms"
                      : "bg-accent-algorithms/60"
                  }`}
                  transition={transition}
                />
                <span className="font-mono text-xs text-muted">
                  {item.value}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      <SimulationControls
        isPlaying={isPlaying}
        speed={speed}
        canStepBack={currentStep > 0}
        canStepForward={currentStep < spec.steps.length}
        onPlayPause={() => setIsPlaying((playing) => !playing)}
        onStepBack={stepBack}
        onStepForward={stepForward}
        onReset={reset}
        onSpeedChange={setSpeed}
      />
    </div>
  );
}
