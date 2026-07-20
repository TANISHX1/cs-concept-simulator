/**
 * Normalizes common OpenAI-compatible model variations into SimulationSpec
 * field names before Zod performs the final validation.
 */
export function normalizeRawSpec(
  raw: Record<string, unknown>,
  fallbackTitle: string,
): Record<string, unknown> {
  const spec = { ...raw };

  if (!spec.title || typeof spec.title !== "string") {
    spec.title = fallbackTitle.slice(0, 80);
  }

  if (!spec.complexity || typeof spec.complexity !== "object") {
    spec.complexity = {
      time: (spec.timeComplexity as string) || "O(?)",
      space: (spec.spaceComplexity as string) || "O(?)",
    };
    delete spec.timeComplexity;
    delete spec.spaceComplexity;
  }

  if (!Array.isArray(spec.pitfalls)) {
    spec.pitfalls = [];
  }

  if (
    spec.visualType === "graph" &&
    spec.initialState &&
    typeof spec.initialState === "object"
  ) {
    const initialState = spec.initialState as Record<string, unknown>;

    if (Array.isArray(initialState.nodes)) {
      initialState.nodes = initialState.nodes.map((node) => {
        const value = node as Record<string, unknown>;
        const id = value.id ?? value.nodeId ?? value.label;

        return {
          id: String(id ?? ""),
          label: String(value.label ?? id ?? ""),
        };
      });
    }
  }

  if (Array.isArray(spec.steps)) {
    spec.steps = spec.steps.map((step) => {
      const normalized = { ...(step as Record<string, unknown>) };

      if (normalized.op && !normalized.type) {
        normalized.type = normalized.op;
        delete normalized.op;
      }

      if (
        normalized.type === "VISIT_NODE" &&
        normalized.nodeId &&
        !normalized.id
      ) {
        normalized.id = normalized.nodeId;
        delete normalized.nodeId;
      }

      if (normalized.type === "HIGHLIGHT") {
        if (normalized.nodeId && !normalized.ids) {
          normalized.ids = [normalized.nodeId];
          delete normalized.nodeId;
        }

        if (typeof normalized.ids === "string") {
          normalized.ids = [normalized.ids];
        }

        if (normalized.index !== undefined && !normalized.indices) {
          normalized.indices = [normalized.index];
          delete normalized.index;
        }
      }

      return normalized;
    });
  }

  return spec;
}

/** Extracts a JSON object from a raw model response or a Markdown code fence. */
export function extractJson(text: string): Record<string, unknown> {
  const fenced = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1) {
    throw new Error("No JSON object found");
  }

  return JSON.parse(candidate.slice(start, end + 1));
}
