import { Sparkles } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { aiHeaders } from "../../lib/apiClient";
import { SimulationSpecSchema } from "../../lib/simulationSpec";
import { useGeneratedConcepts } from "./GeneratedConceptsContext";

type GenerateInputProps = {
  variant?: "panel" | "tile";
};

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

export function GenerateInput({ variant = "panel" }: GenerateInputProps) {
  const navigate = useNavigate();
  const { addGeneratedConcept } = useGeneratedConcepts();
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isTile = variant === "tile";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuery = query.trim();

    if (!trimmedQuery || isLoading) return;

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/generate-simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...aiHeaders() },
        body: JSON.stringify({ query: trimmedQuery }),
      });
      const payload: unknown = await response.json().catch(() => null);

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
    <section
      className={
        isTile
          ? "flex h-full min-h-64 flex-col rounded-2xl border border-dashed border-border bg-surface/45 p-5"
          : "mt-8 rounded-2xl border border-border bg-surface p-5"
      }
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-lg bg-background p-2 text-accent-algorithms">
          <Sparkles size={16} aria-hidden="true" />
        </span>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted">
            Custom simulations
          </p>
          <h2 className="mt-1 text-lg font-semibold">+ New simulation</h2>
          <p className="mt-1 text-sm text-muted">
            Describe an array operation or graph traversal to create an interactive lesson.
          </p>
        </div>
      </div>

      <form className={isTile ? "mt-auto pt-5" : "mt-4"} onSubmit={submit}>
        <label className="sr-only" htmlFor={`generate-concept-query-${variant}`}>
          Concept to generate
        </label>
        {isLoading ? (
          <div
            className="surface-shimmer rounded-xl border border-border p-4"
            role="status"
            aria-live="polite"
          >
            <span className="sr-only">Generating your simulation…</span>
            <div className="h-3 w-1/3 rounded-full bg-surface-hover" />
            <div className="mt-3 h-3 w-2/3 rounded-full bg-surface-hover" />
          </div>
        ) : (
          <div className={`flex gap-2 ${isTile ? "flex-col" : "flex-col sm:flex-row"}`}>
            <input
              id={`generate-concept-query-${variant}`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="For example: breadth-first search"
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted"
            />
            <button
              type="submit"
              disabled={!query.trim()}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Sparkles size={16} aria-hidden="true" />
              Generate
            </button>
          </div>
        )}
        {error && (
          <p className="mt-3 text-sm" style={{ color: "var(--error)" }} role="alert">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
