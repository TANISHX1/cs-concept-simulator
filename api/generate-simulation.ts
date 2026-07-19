import { generateObject, generateText } from "ai";
import binarySearchFixture from "../src/content/seed/binary-search.fixture.json";
import bubbleSortFixture from "../src/content/seed/array.fixture.json";
import bfsFixture from "../src/content/seed/graph.fixture.json";
import dfsFixture from "../src/content/seed/dfs.fixture.json";
import dijkstraFixture from "../src/content/seed/dijkstra.fixture.json";
import mergeSortFixture from "../src/content/seed/merge-sort.fixture.json";
import quickSortFixture from "../src/content/seed/quick-sort.fixture.json";
import roundRobinFixture from "../src/content/seed/round-robin.fixture.json";
import {
  SimulationSpecSchema,
  type SimulationSpec,
} from "../src/lib/simulationSpec";
import { getProvider } from "../src/lib/aiProvider";

type ServerlessRequest = {
  method?: string;
  body?: unknown;
};

type ServerlessResponse = {
  setHeader?: (name: string, value: string) => void;
  status: (statusCode: number) => ServerlessResponse;
  json: (body: unknown) => ServerlessResponse;
};

const fixtureMatchers: ReadonlyArray<{
  pattern: RegExp;
  fixture: SimulationSpec;
}> = [
  {
    pattern: /\b(bubble|swap near)\b/i,
    fixture: SimulationSpecSchema.parse(bubbleSortFixture),
  },
  {
    pattern: /\b(quick|partition|pivot)\b/i,
    fixture: SimulationSpecSchema.parse(quickSortFixture),
  },
  {
    pattern: /\b(merge|divide and conquer)\b/i,
    fixture: SimulationSpecSchema.parse(mergeSortFixture),
  },
  {
    pattern: /\b(binary(?:[-\s]?search)?|sorted search)\b/i,
    fixture: SimulationSpecSchema.parse(binarySearchFixture),
  },
  {
    pattern: /\b(bfs|breadth|queue)\b/i,
    fixture: SimulationSpecSchema.parse(bfsFixture),
  },
  {
    pattern: /\b(dfs|depth|stack)\b/i,
    fixture: SimulationSpecSchema.parse(dfsFixture),
  },
  {
    pattern: /\b(dijkstra|shortest|weighted)\b/i,
    fixture: SimulationSpecSchema.parse(dijkstraFixture),
  },
  {
    pattern: /\b(round[-\s]?robin|scheduling|rr|quantum)\b/i,
    fixture: SimulationSpecSchema.parse(roundRobinFixture),
  },
  {
    pattern: /\b(graph|traversal|network|node|edge)\b/i,
    fixture: SimulationSpecSchema.parse(bfsFixture),
  },
];

const generationInstructions = `You must return a JSON object that EXACTLY matches this schema. Do not deviate.

Required top-level fields:
- "title": string (e.g. "Bubble Sort")
- "visualType": "array" or "graph"
- "pseudocode": string (C-style pseudocode)
- "complexity": { "time": string, "space": string }  — THIS MUST BE AN OBJECT, not flat fields
- "pitfalls": string[]

For visualType "array":
- "initialState": number[] (e.g. [5, 3, 8, 1])
- "steps": array of objects, each with a "type" field (NOT "op") set to one of: "SWAP", "COMPARE", "HIGHLIGHT"
  - SWAP: { "type": "SWAP", "indices": [i, j] }
  - COMPARE: { "type": "COMPARE", "indices": [i, j] }
  - HIGHLIGHT: { "type": "HIGHLIGHT", "indices": [i, ...] }

For visualType "graph":
- "initialState": { "nodes": [{ "id": string, "label": string }], "edges": [{ "from": string, "to": string }] }
  - Every node MUST have both "id" and "label" (label can equal id)
- "steps": array of objects, each with a "type" field (NOT "op") set to one of: "VISIT_NODE", "TRAVERSE_EDGE", "HIGHLIGHT"
  - VISIT_NODE: { "type": "VISIT_NODE", "id": nodeId }  — use "id", NOT "nodeId"
  - TRAVERSE_EDGE: { "type": "TRAVERSE_EDGE", "from": nodeId, "to": nodeId }
  - HIGHLIGHT: { "type": "HIGHLIGHT", "ids": [nodeId, ...] }  — use "ids" array, NOT "nodeId"

CRITICAL: Use "type" not "op" for step discriminator. Use "id" not "nodeId" in VISIT_NODE. Use "complexity" object not flat strings. Include "title". Include "label" on every node.
Return ONLY the JSON object, no markdown fences, no explanation.`;

function selectFixture(query: string): SimulationSpec {
  return (
    fixtureMatchers.find(({ pattern }) => pattern.test(query))?.fixture ??
    fixtureMatchers[0].fixture
  );
}

/**
 * Normalizes raw LLM output to match SimulationSpecSchema.
 * Open-source models frequently use "op" instead of "type",
 * "nodeId" instead of "id", flat complexity strings, etc.
 */
function normalizeRawSpec(raw: Record<string, unknown>, query: string): Record<string, unknown> {
  const spec = { ...raw };

  // Ensure title exists
  if (!spec.title || typeof spec.title !== "string") {
    spec.title = query.slice(0, 80);
  }

  // Normalize flat complexity strings into an object
  if (!spec.complexity || typeof spec.complexity !== "object") {
    spec.complexity = {
      time: (spec.timeComplexity as string) || "O(?)",
      space: (spec.spaceComplexity as string) || "O(?)",
    };
    delete spec.timeComplexity;
    delete spec.spaceComplexity;
  }

  // Ensure pitfalls is an array
  if (!Array.isArray(spec.pitfalls)) {
    spec.pitfalls = [];
  }

  // Normalize graph nodes — add missing "label" field
  if (spec.visualType === "graph" && spec.initialState && typeof spec.initialState === "object") {
    const state = spec.initialState as Record<string, unknown>;
    if (Array.isArray(state.nodes)) {
      state.nodes = (state.nodes as Record<string, unknown>[]).map((node) => ({
        id: node.id ?? node.nodeId ?? String(node.label ?? ""),
        label: node.label ?? node.id ?? node.nodeId ?? "",
        ...node,
        // Ensure id and label always exist
      }));
      // Re-ensure after spread
      state.nodes = (state.nodes as Record<string, unknown>[]).map((node) => ({
        id: String(node.id ?? ""),
        label: String(node.label ?? node.id ?? ""),
      }));
    }
  }

  // Normalize steps — fix "op" → "type", "nodeId" → "id"
  if (Array.isArray(spec.steps)) {
    spec.steps = (spec.steps as Record<string, unknown>[]).map((step) => {
      const normalized = { ...step };

      // Fix "op" → "type"
      if (normalized.op && !normalized.type) {
        normalized.type = normalized.op;
        delete normalized.op;
      }

      // Fix VISIT_NODE: "nodeId" → "id"
      if (normalized.type === "VISIT_NODE" && normalized.nodeId && !normalized.id) {
        normalized.id = normalized.nodeId;
        delete normalized.nodeId;
      }

      // Fix HIGHLIGHT with single nodeId → ids array
      if (normalized.type === "HIGHLIGHT") {
        if (normalized.nodeId && !normalized.ids) {
          normalized.ids = [normalized.nodeId];
          delete normalized.nodeId;
        }
        if (typeof normalized.ids === "string") {
          normalized.ids = [normalized.ids];
        }
        // For array HIGHLIGHT: ensure "indices" is an array
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

/**
 * Extracts JSON from LLM text that may contain markdown fences or preamble.
 */
function extractJson(text: string): Record<string, unknown> {
  // Try to find JSON inside markdown code fences
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = fenceMatch ? fenceMatch[1] : text;

  // Find the first { and last } to extract the JSON object
  const start = jsonStr.indexOf("{");
  const end = jsonStr.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found");

  return JSON.parse(jsonStr.slice(start, end + 1));
}

export default async function handler(
  req: ServerlessRequest,
  res: ServerlessResponse,
) {
  if (req.method !== "POST") {
    res.setHeader?.("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body as { query?: unknown } | undefined;
  const query = typeof body?.query === "string" ? body.query.trim() : "";

  if (!query) {
    return res.status(400).json({ error: "Query is required" });
  }

  console.log("[generate-simulation] USE_FIXTURES =", JSON.stringify(process.env.USE_FIXTURES), "| AI_API_KEY present:", !!process.env.AI_API_KEY);

  if (process.env.USE_FIXTURES === "true") {
    console.log("[generate-simulation] Returning fixture for:", query);
    return res.status(200).json(selectFixture(query));
  }

  let provider;

  try {
    provider = getProvider();
  } catch {
    return res
      .status(503)
      .json({ error: "AI provider is not configured" });
  }

  // Pass 1: Try generateObject (works perfectly with OpenAI, may fail with open-source)
  try {
    const { object } = await generateObject({
      model: provider.provider.chatModel(provider.modelId),
      schema: SimulationSpecSchema,
      schemaName: "simulation_spec",
      system: generationInstructions,
      prompt: query,
    });

    return res.status(200).json(SimulationSpecSchema.parse(object));
  } catch (firstError) {
    console.error("generateObject failed (expected for open-source models), trying fallback...");
  }

  // Pass 2: generateText + normalize — for open-source models that can't do structured output
  try {
    const { text } = await generateText({
      model: provider.provider.chatModel(provider.modelId),
      system: generationInstructions,
      prompt: query,
    });

    const raw = extractJson(text);
    const normalized = normalizeRawSpec(raw, query);
    const parsed = SimulationSpecSchema.safeParse(normalized);

    if (parsed.success) {
      return res.status(200).json(parsed.data);
    }

    console.error("Normalization validation failed:", parsed.error.issues.slice(0, 5));
    return res
      .status(502)
      .json({ error: "The AI returned a simulation that could not be validated. Try rephrasing your query." });
  } catch (error) {
    console.error("Simulation generation failed completely", error);
    return res
      .status(502)
      .json({ error: "Unable to generate a simulation at this time" });
  }
}
