import { LoaderCircle, WandSparkles } from "lucide-react";
import { type FormEvent, useState } from "react";
import type { SimulationSpec } from "../../lib/simulationSpec";
import { SimulationSpecSchema } from "../../lib/simulationSpec";
import { useGeneratedConcepts } from "./GeneratedConceptsContext";

export function VariationInput({
  slug,
  spec,
  currentStep,
}: {
  slug: string;
  spec: SimulationSpec;
  currentStep: number;
}) {
  const { replaceGeneratedConcept } = useGeneratedConcepts();
  const [request, setRequest] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const modificationRequest = request.trim();

    if (!modificationRequest || isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/modify-simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentSpec: spec,
          modificationRequest,
          context: { conceptId: slug, currentStep },
        }),
      });
      const body: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          body &&
          typeof body === "object" &&
          "error" in body &&
          typeof body.error === "string"
            ? body.error
            : "Unable to modify this simulation.";
        throw new Error(message);
      }

      const parsed = SimulationSpecSchema.safeParse(body);

      if (!parsed.success || parsed.data.visualType !== spec.visualType) {
        throw new Error("The variation did not match this simulation type.");
      }

      if (!replaceGeneratedConcept(slug, parsed.data)) {
        throw new Error("This generated concept is no longer available.");
      }

      setRequest("");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to modify this simulation.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mt-6 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-algorithms/15 text-accent-algorithms">
          <WandSparkles size={16} aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-sm font-semibold">Modify this simulation</h2>
          <p className="mt-1 text-sm text-muted">
            Try “reverse the input”, “make the array bigger”, or “add more nodes”.
          </p>
        </div>
      </div>
      <form className="mt-4 flex gap-2" onSubmit={submit}>
        <input
          value={request}
          onChange={(event) => setRequest(event.target.value)}
          disabled={isSubmitting}
          placeholder="Describe a variation…"
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent-algorithms disabled:cursor-not-allowed disabled:opacity-70"
        />
        <button
          type="submit"
          disabled={!request.trim() || isSubmitting}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <LoaderCircle className="animate-spin" size={15} aria-hidden="true" />
          ) : (
            <WandSparkles size={15} aria-hidden="true" />
          )}
          {isSubmitting ? "Updating" : "Apply"}
        </button>
      </form>
      {error && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
