import { ArrayVisualizer } from "./ArrayVisualizer";
import { GraphVisualizer } from "./GraphVisualizer";
import type { SimulationSpec } from "../../lib/simulationSpec";

export type DynamicSimulationProps = {
  spec: SimulationSpec;
};

function formatTargets(value: unknown, separator: string) {
  return Array.isArray(value) ? value.join(separator) : "unknown";
}

function describeStep(step: unknown) {
  if (!step || typeof step !== "object") {
    return "Unknown operation";
  }

  const operation = step as Record<string, unknown>;

  switch (operation.type) {
    case "SWAP":
      return `Swap indices ${formatTargets(operation.indices, " and ")}`;
    case "COMPARE":
      return `Compare indices ${formatTargets(operation.indices, " and ")}`;
    case "VISIT_NODE":
      return `Visit node ${operation.id}`;
    case "TRAVERSE_EDGE":
      return `Traverse edge ${operation.from} to ${operation.to}`;
    case "HIGHLIGHT": {
      const targets = operation.indices ?? operation.ids;
      return `Highlight ${formatTargets(targets, ", ")}`;
    }
    default:
      return typeof operation.type === "string"
        ? operation.type.replaceAll("_", " ").toLowerCase()
        : "Unknown operation";
  }
}

function StepListFallback({ steps }: { steps: unknown[] }) {
  return (
    <ol className="list-decimal space-y-2 pl-5 text-sm text-muted">
      {steps.map((step, index) => (
        <li key={index}>{describeStep(step)}</li>
      ))}
    </ol>
  );
}

export function DynamicSimulation({ spec }: DynamicSimulationProps) {
  if (spec.visualType === "array") {
    return <ArrayVisualizer spec={spec} />;
  }

  if (spec.visualType === "graph") {
    return <GraphVisualizer spec={spec} />;
  }

  const fallbackSpec = spec as unknown as { steps?: unknown[] };

  return <StepListFallback steps={fallbackSpec.steps ?? []} />;
}
