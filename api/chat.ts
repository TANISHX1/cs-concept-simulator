import type { VercelRequest, VercelResponse } from "@vercel/node";
import { convertToModelMessages, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";
import { getProvider } from "../src/lib/aiProvider";

type ChatRequestBody = {
  messages?: unknown;
  conceptTitle?: unknown;
  simulationContext?: unknown;
};

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
  const system = [
    `You are the Concept Copilot inside an interactive CS learning app. Be concise and helpful. Use markdown formatting: **bold** for key terms, bullet points for lists, \`code\` for identifiers. Keep answers short (3-5 sentences for simple questions, use lists for complex ones). Never write essays.`,
    conceptTitle
      ? `The user is currently viewing the concept: ${conceptTitle}.`
      : undefined,
    simulationGrounding,
  ]
    .filter((instruction): instruction is string => Boolean(instruction))
    .join("\n");

  let provider;

  try {
    provider = getProvider();
  } catch {
    return response
      .status(503)
      .json({ error: "AI provider is not configured" });
  }

  try {
    const messages = await convertToModelMessages(body.messages as UIMessage[]);
    const result = streamText({
      model: provider.provider.chatModel(provider.modelId),
      messages,
      tools: {
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
      },
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
