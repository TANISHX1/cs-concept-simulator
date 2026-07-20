import { generateText } from "ai";
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
import { extractJson, normalizeRawSpec } from "../src/lib/llmUtils";

type RequestHeaders = Record<string, string | string[] | undefined>;

type ServerlessRequest = {
  method?: string;
  body?: unknown;
  headers?: RequestHeaders;
};

type ServerlessResponse = {
  setHeader?: (name: string, value: string) => void;
  status: (statusCode: number) => ServerlessResponse;
  json: (body: unknown) => ServerlessResponse;
};

function readHeader(request: ServerlessRequest, name: string) {
  const header = Object.entries(request.headers ?? {}).find(
    ([key]) => key.toLowerCase() === name,
  )?.[1];
  const value = Array.isArray(header) ? header[0] : header;
  const trimmed = value?.trim();

  return trimmed || undefined;
}

function getRequestProviderOptions(request: ServerlessRequest) {
  return {
    apiKey: readHeader(request, "x-api-key"),
    baseUrl: readHeader(request, "x-base-url"),
    model: readHeader(request, "x-model"),
  };
}

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

  const useFixtures = process.env.USE_FIXTURES;
  const providerOptions = getRequestProviderOptions(req);
  const hasApiKey = Boolean(providerOptions.apiKey || process.env.AI_API_KEY);

  if (!hasApiKey && useFixtures !== "false") {
    return res.status(200).json(selectFixture(query));
  }

  let provider;

  try {
    provider = getProvider(providerOptions);
  } catch {
    return res
      .status(503)
      .json({ error: "AI provider is not configured" });
  }

  // Use generateText + normalizer: works reliably with any OpenAI-compatible provider
  // including NVIDIA NIM and Ollama which don't support JSON schema enforcement.
  try {
    const { text } = await generateText({
      model: provider.provider.chatModel(provider.modelId),
      system: generationInstructions,
      prompt: query,
    });

    let raw: Record<string, unknown>;
    try {
      raw = extractJson(text);
    } catch {
      return res.status(502).json({ error: "The AI returned an unreadable response. Try rephrasing your query." });
    }

    const normalized = normalizeRawSpec(raw, query);
    const parsed = SimulationSpecSchema.safeParse(normalized);

    if (parsed.success) {
      return res.status(200).json(parsed.data);
    }

    console.error("[generate-simulation] Validation failed after normalization:", parsed.error.issues.slice(0, 3));
    return res
      .status(502)
      .json({ error: "The AI returned a simulation that could not be validated. Try rephrasing your query." });
  } catch (error) {
    console.error("[generate-simulation] Generation failed:", error);
    return res
      .status(502)
      .json({ error: "Unable to generate a simulation at this time" });
  }
}
