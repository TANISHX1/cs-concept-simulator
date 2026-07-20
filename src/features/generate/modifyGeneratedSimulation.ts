import { aiHeaders } from "../../lib/apiClient";
import {
  SimulationSpecSchema,
  type SimulationSpec,
} from "../../lib/simulationSpec";

function getErrorMessage(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }

  return "Unable to modify this simulation.";
}

export async function modifyGeneratedSimulation(
  currentSpec: SimulationSpec,
  modificationRequest: string,
) {
  const response = await fetch("/api/modify-simulation", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...aiHeaders() },
    body: JSON.stringify({ currentSpec, modificationRequest }),
  });
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getErrorMessage(payload));
  }

  const parsed = SimulationSpecSchema.safeParse(payload);

  if (!parsed.success || parsed.data.visualType !== currentSpec.visualType) {
    throw new Error("The variation did not match this simulation type.");
  }

  return parsed.data;
}
