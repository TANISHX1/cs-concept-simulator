import type { SimulationSpec } from "../../lib/simulationSpec";

type StepExplanation = {
  label: string;
  title: string;
  detail: string;
};

function getArrayValuesAtStep(
  spec: Extract<SimulationSpec, { visualType: "array" }>,
  currentStep: number,
) {
  const values = [...spec.initialState];

  for (const step of spec.steps.slice(0, currentStep)) {
    if (step.type === "SWAP") {
      const [left, right] = step.indices;
      [values[left], values[right]] = [values[right], values[left]];
    }
  }

  return values;
}

function describeArrayStep(
  spec: Extract<SimulationSpec, { visualType: "array" }>,
  currentStep: number,
): StepExplanation {
  if (currentStep === 0) {
    return {
      label: "Starting state",
      title: `Begin with [${spec.initialState.join(", ")}].`,
      detail:
        "No operation has run yet. Step forward to see how the algorithm inspects, rearranges, or focuses on values.",
    };
  }

  const step = spec.steps[currentStep - 1];
  const before = getArrayValuesAtStep(spec, currentStep - 1);
  const after = getArrayValuesAtStep(spec, currentStep);

  if (step.type === "SWAP") {
    const [left, right] = step.indices;
    const leftValue = before[left];
    const rightValue = before[right];

    return {
      label: `Step ${currentStep} · swap`,
      title: `Swap index ${left} (${leftValue}) with index ${right} (${rightValue}).`,
      detail: `The values exchange positions, producing [${after.join(", ")}]. A swap changes order but preserves every value in the array.`,
    };
  }

  if (step.type === "COMPARE") {
    const [left, right] = step.indices;

    return {
      label: `Step ${currentStep} · compare`,
      title: `Compare index ${left} (${before[left]}) with index ${right} (${before[right]}).`,
      detail:
        "This check determines the algorithm's next decision. Comparing highlights the two values but does not change the array.",
    };
  }

  const positions = step.indices.map((index) => `${index} (${before[index]})`);

  return {
    label: `Step ${currentStep} · focus`,
    title: `Highlight ${positions.join(", ")}.`,
    detail:
      "The highlight calls attention to the values currently relevant to the algorithm; their positions and values stay the same.",
  };
}

function describeGraphStep(
  spec: Extract<SimulationSpec, { visualType: "graph" }>,
  currentStep: number,
): StepExplanation {
  const labels = new Map(
    spec.initialState.nodes.map((node) => [node.id, node.label]),
  );
  const labelFor = (id: string) => labels.get(id) ?? id;

  if (currentStep === 0) {
    return {
      label: "Starting state",
      title: `Begin with ${spec.initialState.nodes.length} nodes and ${spec.initialState.edges.length} edges.`,
      detail:
        "No node has been visited yet. Step forward to follow the traversal through the graph one operation at a time.",
    };
  }

  const step = spec.steps[currentStep - 1];

  if (step.type === "VISIT_NODE") {
    const label = labelFor(step.id);

    return {
      label: `Step ${currentStep} · visit`,
      title: `Visit node ${label}.`,
      detail: `${label} is now marked as visited. Keeping this history prevents the traversal from processing the same node again.`,
    };
  }

  if (step.type === "TRAVERSE_EDGE") {
    const from = labelFor(step.from);
    const to = labelFor(step.to);

    return {
      label: `Step ${currentStep} · traverse edge`,
      title: `Follow the edge ${from} → ${to}.`,
      detail: `The highlighted line shows the route from ${from} to ${to}. Traversing an edge records how the algorithm moves through the graph.`,
    };
  }

  const highlighted = step.ids.map(labelFor);

  return {
    label: `Step ${currentStep} · focus`,
    title: `Highlight ${highlighted.join(", ")}.`,
    detail:
      "These nodes are the current focus of the traversal. Highlighting draws attention to them without changing the graph's connections.",
  };
}

export function SimulationStepExplanation({
  spec,
  currentStep,
}: {
  spec: SimulationSpec;
  currentStep: number;
}) {
  const explanation =
    spec.visualType === "array"
      ? describeArrayStep(spec, currentStep)
      : describeGraphStep(spec, currentStep);

  return (
    <section
      className="mt-6 rounded-2xl border border-border bg-surface p-5"
      aria-live="polite"
    >
      <p className="font-mono text-[10px] uppercase tracking-[.18em] text-accent-algorithms">
        {explanation.label}
      </p>
      <h4 className="mt-2 text-base font-semibold">{explanation.title}</h4>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {explanation.detail}
      </p>
    </section>
  );
}
