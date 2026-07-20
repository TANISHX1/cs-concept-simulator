import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ElementType,
} from "react";
import {
  SimulationControls,
  type SimulationSpeed,
} from "../../components/ui/SimulationControls";
import type { CodeTrace, TraceableSimulationProps } from "../../lib/types";
import { CodeTracePanel } from "./CodeTracePanel";

function traceIndexesFor(
  entry: CodeTrace["stepMap"][number] | undefined,
  traceLength: number,
) {
  if (typeof entry === "number") return [Math.min(Math.max(entry, 0), traceLength - 1)];

  if (Array.isArray(entry)) {
    const [start, end] = entry;
    const first = Math.min(Math.max(start, 0), traceLength - 1);
    const last = Math.min(Math.max(end, first), traceLength - 1);

    return Array.from({ length: last - first + 1 }, (_, index) => first + index);
  }

  return [0];
}

export function ConceptWorkbench({
  Simulation,
  trace,
  accentSection = "algorithms",
}: {
  Simulation: ElementType<TraceableSimulationProps>;
  trace: CodeTrace;
  accentSection?: string;
}) {
  const maxStep = Math.max(0, trace.stepMap.length - 1);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<SimulationSpeed>(1);

  useEffect(() => {
    setCurrentStep((step) => Math.min(step, maxStep));
  }, [maxStep]);

  useEffect(() => {
    if (!isPlaying) return undefined;

    const intervalId = window.setInterval(() => {
      setCurrentStep((step) => {
        const nextStep = Math.min(step + 1, maxStep);

        if (nextStep === maxStep) setIsPlaying(false);
        return nextStep;
      });
    }, 650 / speed);

    return () => window.clearInterval(intervalId);
  }, [isPlaying, maxStep, speed]);

  const traceStepIndices = useMemo(
    () => traceIndexesFor(trace.stepMap[currentStep], trace.steps.length),
    [currentStep, trace.stepMap, trace.steps.length],
  );

  const reset = () => {
    setCurrentStep(0);
    setIsPlaying(false);
  };

  return (
    <section
      className="trace-workbench"
      aria-label="Synchronized simulation and code trace"
      style={
        {
          "--trace-accent": `var(--accent-${accentSection})`,
        } as CSSProperties
      }
    >
      <div className="trace-workbench-grid">
        <section className="trace-visual-panel" aria-label="Concept simulation">
          <p className="trace-eyebrow">Abstract model</p>
          <Simulation externalStep={currentStep} />
        </section>
        <CodeTracePanel
          trace={trace}
          traceStepIndices={traceStepIndices}
          currentStep={currentStep}
          maxStep={maxStep}
        />
      </div>

      <SimulationControls
        isPlaying={isPlaying}
        speed={speed}
        canStepBack={currentStep > 0}
        canStepForward={currentStep < maxStep}
        onPlayPause={() => setIsPlaying((playing) => !playing)}
        onStepBack={() => setCurrentStep((step) => Math.max(0, step - 1))}
        onStepForward={() => setCurrentStep((step) => Math.min(maxStep, step + 1))}
        onReset={reset}
        onSpeedChange={setSpeed}
      />
    </section>
  );
}
