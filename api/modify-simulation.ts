import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateText } from "ai";
import { getProvider } from "../src/lib/aiProvider";
import { extractJson, normalizeRawSpec } from "../src/lib/llmUtils";
import {
  SimulationSpecSchema,
  type SimulationSpec,
} from "../src/lib/simulationSpec";

type ArraySimulationSpec = Extract<SimulationSpec, { visualType: "array" }>;
type GraphSimulationSpec = Extract<SimulationSpec, { visualType: "graph" }>;

type ModificationRequestBody = {
  currentSpec?: unknown;
  modificationRequest?: unknown;
};

function readHeader(request: VercelRequest, name: string) {
  const header = Object.entries(request.headers).find(
    ([key]) => key.toLowerCase() === name,
  )?.[1];
  const value = Array.isArray(header) ? header[0] : header;
  const trimmed = value?.trim();

  return trimmed || undefined;
}

function getRequestProviderOptions(request: VercelRequest) {
  return {
    apiKey: readHeader(request, "x-api-key"),
    baseUrl: readHeader(request, "x-base-url"),
    model: readHeader(request, "x-model"),
  };
}

function addDeterministicArrayValues(
  spec: ArraySimulationSpec,
): ArraySimulationSpec {
  const length = spec.initialState.length;
  const maximum = Math.max(0, ...spec.initialState.map((value) => Math.abs(value)));
  const firstValue = maximum + length + 1;
  const secondValue = firstValue + Math.max(1, length);
  const initialState = [...spec.initialState, firstValue, secondValue];

  return {
    ...spec,
    initialState,
    steps: [
      ...spec.steps,
      {
        type: "HIGHLIGHT",
        indices: [length],
        description: `Added value ${firstValue}.`,
      },
      {
        type: "HIGHLIGHT",
        indices: [length + 1],
        description: `Added value ${secondValue}.`,
      },
    ],
  };
}

function readRequestedNodeCount(request: string) {
  const match = request.match(/\b(\d+)\s+nodes?\b/i);
  const count = match ? Number.parseInt(match[1], 10) : undefined;

  return count && count > 0 ? count : undefined;
}

function addGraphNodes(
  spec: GraphSimulationSpec,
  requestedCount: number | undefined,
): GraphSimulationSpec {
  const nodes = [...spec.initialState.nodes];
  const edges = [...spec.initialState.edges];
  const existingIds = new Set(nodes.map((node) => node.id));
  const target = Math.max(nodes.length + 1, requestedCount ?? 0);
  let suffix = nodes.length + 1;

  while (nodes.length < target) {
    let id = `node-${suffix}`;

    while (existingIds.has(id)) {
      suffix += 1;
      id = `node-${suffix}`;
    }

    const previous = nodes.at(-1);
    nodes.push({ id, label: `Node ${suffix}` });
    existingIds.add(id);

    if (previous) {
      edges.push({ from: previous.id, to: id });
    }

    suffix += 1;
  }

  return {
    ...spec,
    initialState: { nodes, edges },
  };
}

function createFixtureVariation(
  spec: SimulationSpec,
  modificationRequest: string,
): SimulationSpec {
  const request = modificationRequest.toLowerCase();

  if (/\brevers(e|ed|ing)?\b/.test(request)) {
    if (spec.visualType === "array") {
      return {
        ...spec,
        initialState: [...spec.initialState].reverse(),
        steps: [...spec.steps].reverse(),
      };
    }

    return {
      ...spec,
      initialState: {
        nodes: [...spec.initialState.nodes].reverse(),
        edges: [...spec.initialState.edges],
      },
      steps: [...spec.steps].reverse(),
    };
  }

  const requestedNodeCount = readRequestedNodeCount(request);
  const wantsMore = /\b(more|bigger)\b/.test(request);

  if (spec.visualType === "array" && wantsMore) {
    return addDeterministicArrayValues(spec);
  }

  if (spec.visualType === "graph" && (wantsMore || requestedNodeCount)) {
    return addGraphNodes(spec, requestedNodeCount);
  }

  return {
    ...spec,
    title: `${spec.title} (modified)`,
  };
}

const modificationSystemPrompt =
  "You are modifying an existing CS simulation. Keep the same visualType. Apply the user's modification request to the spec. Return ONLY valid JSON matching the schema.";

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const body = request.body as ModificationRequestBody | undefined;
  const modificationRequest =
    typeof body?.modificationRequest === "string"
      ? body.modificationRequest.trim()
      : "";
  const currentSpec = SimulationSpecSchema.safeParse(body?.currentSpec);

  if (!modificationRequest) {
    return response.status(400).json({ error: "Modification request is required" });
  }

  if (!currentSpec.success) {
    return response.status(400).json({ error: "A valid current simulation is required" });
  }

  const providerOptions = getRequestProviderOptions(request);
  const hasApiKey = Boolean(providerOptions.apiKey || process.env.AI_API_KEY);

  if (!hasApiKey && process.env.USE_FIXTURES !== "false") {
    return response
      .status(200)
      .json(createFixtureVariation(currentSpec.data, modificationRequest));
  }

  let provider;

  try {
    provider = getProvider(providerOptions);
  } catch {
    return response.status(503).json({ error: "AI provider is not configured" });
  }

  try {
    const { text } = await generateText({
      model: provider.provider.chatModel(provider.modelId),
      system: modificationSystemPrompt,
      prompt: `Current SimulationSpec:\n${JSON.stringify(currentSpec.data)}\n\nModification request:\n${modificationRequest}`,
    });
    const modifiedSpec = SimulationSpecSchema.safeParse(
      normalizeRawSpec(extractJson(text), currentSpec.data.title),
    );

    if (!modifiedSpec.success) {
      return response.status(502).json({
        error:
          "The AI returned an invalid variation. Try a more specific modification request.",
      });
    }

    if (modifiedSpec.data.visualType !== currentSpec.data.visualType) {
      return response.status(422).json({
        error: "The generated variation changed the simulation type",
      });
    }

    return response.status(200).json(modifiedSpec.data);
  } catch (error) {
    console.error("Simulation modification failed", error);
    return response
      .status(502)
      .json({ error: "Unable to modify this simulation at this time" });
  }
}
