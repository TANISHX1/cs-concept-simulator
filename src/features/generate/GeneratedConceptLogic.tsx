import type { SimulationSpec } from "../../lib/simulationSpec";

function getOperationSummary(spec: SimulationSpec) {
  if (spec.visualType === "array") {
    const comparisons = spec.steps.filter(
      (step) => step.type === "COMPARE",
    ).length;
    const swaps = spec.steps.filter((step) => step.type === "SWAP").length;

    return {
      coreTitle: "Inspect, decide, then rearrange",
      coreDetail: `This simulation starts with ${spec.initialState.length} values. It uses ${comparisons} comparison${comparisons === 1 ? "" : "s"} and ${swaps} swap${swaps === 1 ? "" : "s"} to make the array's decisions visible.`,
      invariantTitle: "The values are preserved",
      invariantDetail:
        "A comparison only observes two positions, and a swap only changes their order. The same set of values remains in the array after every step.",
      steps: [
        "Start from the displayed input array and identify the positions relevant to the next operation.",
        "Compare the highlighted values; this determines whether their current order should change.",
        "When a swap appears, exchange those two positions and keep every other value in place.",
        "Use highlights to track the pair or region the algorithm is currently reasoning about.",
      ],
    };
  }

  const visits = spec.steps.filter((step) => step.type === "VISIT_NODE").length;
  const traversals = spec.steps.filter(
    (step) => step.type === "TRAVERSE_EDGE",
  ).length;

  return {
    coreTitle: "Explore the graph one connection at a time",
    coreDetail: `This graph contains ${spec.initialState.nodes.length} nodes and ${spec.initialState.edges.length} edges. The sequence records ${visits} visit${visits === 1 ? "" : "s"} and ${traversals} edge traversal${traversals === 1 ? "" : "s"}.`,
    invariantTitle: "Visited history only grows",
    invariantDetail:
      "Once a node is marked visited, it remains part of the completed traversal. Edge traversal shows how the algorithm reached or examined a connection.",
    steps: [
      "Begin with the displayed nodes and edges, then select the current node or frontier to examine.",
      "Traverse a highlighted edge to show the connection currently being followed.",
      "Mark the destination or current node visited so the traversal can avoid repeating completed work.",
      "Use node highlights to make the active frontier, path, or focus set easy to follow.",
    ],
  };
}

export function GeneratedConceptLogic({
  spec,
  conceptId,
  currentStep,
  onSelectLine,
}: {
  spec: SimulationSpec;
  conceptId: string;
  currentStep: number;
  onSelectLine: (lineNumber: number, text: string) => void;
}) {
  const summary = getOperationSummary(spec);

  return (
    <article className="max-w-none text-foreground">
      <div className="logic-grid">
        <section className="logic-card">
          <span className="logic-eyebrow">Core idea</span>
          <h3>{summary.coreTitle}</h3>
          <p>{summary.coreDetail}</p>
        </section>
        <section className="logic-card">
          <span className="logic-eyebrow">Invariant</span>
          <h3>{summary.invariantTitle}</h3>
          <p>{summary.invariantDetail}</p>
        </section>
      </div>

      <section>
        <h2 className="text-xl font-semibold">Algorithm steps</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted">
          {summary.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="mt-8">
        <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted">
          C-style pseudocode
        </p>
        <pre className="logic-code">
          <code>
            {spec.pseudocode.split("\n").map((line, index) => (
              <button
                key={`${index}-${line}`}
                type="button"
                onClick={() => onSelectLine(index + 1, line)}
                className="block w-full rounded px-2 text-left font-inherit text-inherit outline-none transition hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-accent-algorithms"
                aria-label={`Discuss pseudocode line ${index + 1}`}
              >
                <span className="mr-3 inline-block w-5 select-none text-right text-muted">
                  {index + 1}
                </span>
                {line || " "}
              </button>
            ))}
          </code>
        </pre>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Complexity</h2>
        <div className="complexity-grid">
          <div>
            <span className="complexity-label">Time</span>
            <strong className="complexity-value">{spec.complexity.time}</strong>
            <span className="complexity-note">for the represented algorithm</span>
          </div>
          <div>
            <span className="complexity-label">Space</span>
            <strong className="complexity-value">{spec.complexity.space}</strong>
            <span className="complexity-note">additional working storage</span>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Common pitfalls</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
          {spec.pitfalls.map((pitfall, index) => (
            <li key={`${pitfall}-${index}`}>{pitfall}</li>
          ))}
        </ul>
      </section>

      <p className="sr-only">
        Current simulation step: {currentStep}. Concept: {conceptId}.
      </p>
    </article>
  );
}
