import { LoaderCircle, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SimulationSpecSchema } from "../../lib/simulationSpec";
import { useGeneratedConcepts } from "./GeneratedConceptsContext";

function getErrorMessage(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }

  return "Unable to generate a simulation right now. Please try again.";
}

export function GenerateInput() {
  const navigate = useNavigate();
  const { addGeneratedConcept } = useGeneratedConcepts();
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuery = query.trim();

    if (!trimmedQuery || isLoading) return;

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/generate-simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmedQuery }),
      });
      let payload: unknown;

      try {
        payload = await response.json();
      } catch {
        throw new Error("The generator returned an unreadable response.");
      }

      if (!response.ok) {
        throw new Error(getErrorMessage(payload));
      }

      const parsed = SimulationSpecSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("The generated simulation did not match the expected format.");
      }

      const generatedConcept = addGeneratedConcept(parsed.data);
      navigate(`/workspace/generated/${generatedConcept.slug}`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to generate a simulation right now. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="mt-8 rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-lg bg-background p-2 text-accent-algorithms">
          <Sparkles size={16} aria-hidden="true" />
        </span>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted">
            Generate a concept
          </p>
          <h2 className="mt-1 text-lg font-semibold">What should we simulate?</h2>
          <p className="mt-1 text-sm text-muted">
            Describe an array operation or graph traversal to create an interactive lesson.
          </p>
        </div>
      </div>

      <form className="mt-4" onSubmit={submit}>
        <label className="sr-only" htmlFor="generate-concept-query">
          Concept to generate
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="generate-concept-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="For example: breadth-first search on a small graph"
            disabled={isLoading}
            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted disabled:cursor-not-allowed disabled:text-muted"
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />
            ) : (
              <Sparkles size={16} aria-hidden="true" />
            )}
            {isLoading ? "Generating…" : "Generate"}
          </button>
        </div>
        {error && (
          <p className="mt-3 text-sm" style={{ color: "var(--error)" }} role="alert">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
