import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateObject } from "ai";
import { getProvider } from "../src/lib/aiProvider";
import {
  SimulationSpecSchema,
  type SimulationSpec,
} from "../src/lib/simulationSpec";

type ArraySimulationSpec = Extract<SimulationSpec, { visualType: "array" }>;
type GraphSimulationSpec = Extract<SimulationSpec, { visualType: "graph" }>;

type ModificationRequestBody = {
  currentSpec?: unknown;
  modificationRequest?: unknown;
  context?: unknown;
};

function variationTitle(title: string, suffix: string) {
  return `${title} — ${suffix}`;
}

function deriveBubbleSortSteps(values: number[]): ArraySimulationSpec["steps"] {
  const working = [...values];
  const steps: ArraySimulationSpec["steps"] = [];

  for (let end = working.length - 1; end > 0; end -= 1) {
    for (let index = 0; index < end; index += 1) {
      steps.push({ type: "COMPARE", indices: [index, index + 1] });

      if (working[index] > working[index + 1]) {
        steps.push({ type: "SWAP", indices: [index, index + 1] });
        [working[index], working[index + 1]] = [
          working[index + 1],
          working[index],
        ];
      }
    }
  }

  return steps;
}

function makeArrayLarger(spec: ArraySimulationSpec): ArraySimulationSpec {
  const maxValue = Math.max(0, ...spec.initialState.map(Math.abs));
  const initialState = [
    ...spec.initialState,
    ...spec.initialState.map((value, index) => maxValue + value + index + 1),
  ];

  return {
    ...spec,
    title: variationTitle(spec.title, "larger input"),
    initialState,
    steps: deriveBubbleSortSteps(initialState),
  };
}

function addGraphNode(spec: GraphSimulationSpec): GraphSimulationSpec {
  const existingIds = new Set(spec.initialState.nodes.map((node) => node.id));
  let suffix = spec.initialState.nodes.length + 1;
  let id = `node-${suffix}`;

  while (existingIds.has(id)) {
    suffix += 1;
    id = `node-${suffix}`;
  }

  const parent = spec.initialState.nodes.at(-1)?.id;
  const node = { id, label: `Node ${suffix}` };
  const edges = parent
    ? [...spec.initialState.edges, { from: parent, to: id }]
    : spec.initialState.edges;
  const steps = parent
    ? [
        ...spec.steps,
        { type: "TRAVERSE_EDGE" as const, from: parent, to: id },
        { type: "VISIT_NODE" as const, id },
      ]
    : [...spec.steps, { type: "VISIT_NODE" as const, id }];

  return {
    ...spec,
    title: variationTitle(spec.title, "expanded graph"),
    initialState: {
      nodes: [...spec.initialState.nodes, node],
      edges,
    },
    steps,
  };
}

function reverseGraph(spec: GraphSimulationSpec): GraphSimulationSpec {
  return {
    ...spec,
    title: variationTitle(spec.title, "reversed traversal"),
    initialState: {
      nodes: [...spec.initialState.nodes].reverse(),
      edges: spec.initialState.edges
        .map(({ from, to }) => ({ from: to, to: from }))
        .reverse(),
    },
    steps: spec.steps.map((step) =>
      step.type === "TRAVERSE_EDGE"
        ? { ...step, from: step.to, to: step.from }
        : step,
    ),
  };
}

function createFixtureVariation(
  spec: SimulationSpec,
  modificationRequest: string,
): SimulationSpec {
  const request = modificationRequest.toLowerCase();
  const wantsReverse = /\brevers(e|ed|ing)?\b/.test(request);

  if (spec.visualType === "array") {
    if (/\b(bigger|larger|more values?|expand)\b/.test(request)) {
      return makeArrayLarger(spec);
    }

    if (wantsReverse) {
      return {
        ...spec,
        title: variationTitle(spec.title, "reversed input"),
        initialState: [...spec.initialState].reverse(),
        steps: [...spec.steps].reverse(),
      };
    }

    return {
      ...spec,
      title: variationTitle(spec.title, "highlighted pass"),
      steps: [
        ...spec.steps,
        {
          type: "HIGHLIGHT",
          indices: spec.initialState.map((_, index) => index),
        },
      ],
    };
  }

  if (/\b(more nodes?|add node|expand)\b/.test(request)) {
    return addGraphNode(spec);
  }

  if (wantsReverse) {
    return reverseGraph(spec);
  }

  return {
    ...spec,
    title: variationTitle(spec.title, "highlighted traversal"),
    steps: [
      ...spec.steps,
      { type: "HIGHLIGHT", ids: spec.initialState.nodes.map((node) => node.id) },
    ],
  };
}

function buildModificationInstructions(visualType: SimulationSpec["visualType"]) {
  return `Modify the supplied computer-science simulation specification in place.

Keep visualType exactly "${visualType}". Return a complete schema-valid SimulationSpec using only the operations supported by that visual type. Keep array indices and graph node IDs valid, preserve concise C-style pseudocode, and update complexity or pitfalls only when the requested variation changes them.`;
}

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

  if (process.env.USE_FIXTURES === "true") {
    return response
      .status(200)
      .json(createFixtureVariation(currentSpec.data, modificationRequest));
  }

  let provider;

  try {
    provider = getProvider();
  } catch {
    return response
      .status(503)
      .json({ error: "AI provider is not configured" });
  }

  try {
    const { object } = await generateObject({
      model: provider.provider.chatModel(provider.modelId),
      schema: SimulationSpecSchema,
      schemaName: "simulation_spec",
      system: buildModificationInstructions(currentSpec.data.visualType),
      prompt: `Current specification:\n${JSON.stringify(currentSpec.data)}\n\nRequested modification:\n${modificationRequest}`,
    });
    const modifiedSpec = SimulationSpecSchema.parse(object);

    if (modifiedSpec.visualType !== currentSpec.data.visualType) {
      return response.status(422).json({
        error: "The generated variation changed the simulation type",
      });
    }

    return response.status(200).json(modifiedSpec);
  } catch (error) {
    console.error("Simulation modification failed", error);
    return response
      .status(502)
      .json({ error: "Unable to modify this simulation at this time" });
  }
}
