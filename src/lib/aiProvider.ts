import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1";
const DEFAULT_MODEL = "meta/llama-3.3-70b-instruct";

/**
 * Builds the server-only model provider used by every AI endpoint.
 *
 * The defaults keep local configuration concise while the AI_* environment
 * variables allow the deployment to target any OpenAI-compatible provider.
 */
export function getProvider() {
  const apiKey = process.env.AI_API_KEY;

  if (!apiKey) {
    throw new Error("AI provider is not configured");
  }

  const provider = createOpenAICompatible({
    name: "consim",
    baseURL: process.env.AI_BASE_URL || DEFAULT_BASE_URL,
    apiKey,
  });

  return {
    provider,
    modelId: process.env.AI_MODEL || DEFAULT_MODEL,
  };
}
