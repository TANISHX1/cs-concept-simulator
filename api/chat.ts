import type { VercelRequest, VercelResponse } from "@vercel/node";
import { convertToModelMessages, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";
import { getProvider } from "../src/lib/aiProvider";

type ChatRequestBody = {
  messages?: unknown;
  conceptTitle?: unknown;
  simulationContext?: unknown;
  canModifySimulation?: unknown;
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

type SimulationGrounding = {
  conceptId: string;
  currentStep: number;
  stateSnapshot: unknown;
};

function readSimulationGrounding(value: unknown): SimulationGrounding | undefined {
  if (!value || typeof value !== "object") return undefined;

  const context = value as Record<string, unknown>;

  if (
    typeof context.conceptId !== "string" ||
    !context.conceptId ||
    typeof context.currentStep !== "number" ||
    !Number.isInteger(context.currentStep) ||
    !("stateSnapshot" in context)
  ) {
    return undefined;
  }

  return {
    conceptId: context.conceptId,
    currentStep: context.currentStep,
    stateSnapshot: context.stateSnapshot,
  };
}

function formatSimulationGrounding(
  grounding: SimulationGrounding | undefined,
) {
  if (!grounding) return undefined;

  try {
    return `The user selected this exact simulation state. Ground your answer in it when relevant: ${JSON.stringify(grounding)}.`;
  } catch {
    return undefined;
  }
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const body = request.body as ChatRequestBody | undefined;

  if (!body || !Array.isArray(body.messages)) {
    return response.status(400).json({ error: "Messages are required" });
  }

  const conceptTitle =
    typeof body.conceptTitle === "string" && body.conceptTitle.trim()
      ? body.conceptTitle.trim()
      : undefined;
  const simulationGrounding = formatSimulationGrounding(
    readSimulationGrounding(body.simulationContext),
  );
  const canModifySimulation = body.canModifySimulation === true;
  const system = [
    `You are the Trace Kernel Copilot — a precise, expert teaching assistant embedded in an interactive simulator. Rules:
- ALWAYS use markdown: **bold** key terms, \`code\` for identifiers/operations, bullet lists for multi-part answers.
- Keep answers to 3-5 sentences MAX for conceptual questions.
- For "how does X work" questions: give 1 sentence summary + 3-4 bullet points.
- For "show me step N" or "go to step N": call the setSimulationStep tool immediately, then explain that step in 2 sentences.
- NEVER write paragraphs of plain text. NEVER exceed 150 words unless asked for a deep dive.
- Reference the current concept and step when relevant.`,
    canModifySimulation
      ? "This is a generated simulation. When the user asks to alter its input, node count, graph, or operations, call modifySimulation with their exact modification request. Use setSimulationStep only for navigation to an existing step."
      : undefined,
    conceptTitle
      ? `The user is currently viewing the concept: ${conceptTitle}.`
      : undefined,
    simulationGrounding,
  ]
    .filter((instruction): instruction is string => Boolean(instruction))
    .join("\n");

  let provider;

  try {
    provider = getProvider(getRequestProviderOptions(request));
  } catch {
    return response
      .status(503)
      .json({ error: "AI provider is not configured" });
  }

  try {
    const tools = {
      setSimulationStep: tool({
        description:
          "Move the active simulation to a displayed step. Use this when the user asks to show, jump to, or explain a specific simulation step. Step 0 is the initial state and step 1 is the first operation.",
        inputSchema: z.object({
          index: z
            .number()
            .int()
            .nonnegative()
            .describe("The displayed simulation step to show."),
        }),
      }),
      ...(canModifySimulation
        ? {
            modifySimulation: tool({
              description:
                "Modify the active generated simulation in place. Use this for requests such as reversing its input, changing its number of nodes, or changing the represented graph or operations.",
              inputSchema: z.object({
                modificationRequest: z
                  .string()
                  .min(1)
                  .max(500)
                  .describe("The user's requested simulation variation."),
              }),
            }),
          }
        : {}),
    };
    const messages = await convertToModelMessages(body.messages as UIMessage[], {
      tools,
    });
    const result = streamText({
      model: provider.provider.chatModel(provider.modelId),
      messages,
      tools,
      ...(system ? { system } : {}),
    });

    result.pipeUIMessageStreamToResponse(response);
  } catch (error) {
    console.error("Chat streaming failed", error);
    return response
      .status(502)
      .json({ error: "Unable to start the chat response" });
  }
}
