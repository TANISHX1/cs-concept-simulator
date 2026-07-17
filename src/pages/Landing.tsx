import { lazy, Suspense } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const HeroScene = lazy(() => import("./HeroScene"));

export default function Landing() {
  return (
    <main className="min-h-screen overflow-hidden">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-foreground font-mono text-sm text-background">
            ∷
          </div>
          <span className="font-semibold tracking-tight">
            CS Concept Simulator
          </span>
        </div>
        <Link
          to="/workspace"
          className="text-sm text-muted hover:text-foreground"
        >
          Open workspace <ArrowRight className="ml-1 inline" size={14} />
        </Link>
      </nav>

      <section className="relative mx-auto grid max-w-7xl items-center gap-6 px-6 pb-20 pt-12 lg:grid-cols-[1.05fr_.95fr] lg:pt-20">
        <div className="relative z-10">
          <p className="mb-6 font-mono text-[11px] uppercase tracking-[.25em] text-accent-algorithms">
            An interactive CS lab
          </p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[.98] tracking-[-.05em] sm:text-7xl">
            Make the invisible parts of computing{" "}
            <span className="text-muted">visible.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted">
            Explore algorithms, systems, and protocols as living diagrams.
            Change a step. Watch the model respond. Build intuition that sticks.
          </p>
          <div className="mt-9 flex gap-3">
            <Link
              to="/workspace/algorithms/sorting/merge-sort"
              className="rounded-lg bg-foreground px-5 py-3 text-sm font-medium text-background transition hover:opacity-85"
            >
              Enter the lab <ArrowRight className="ml-2 inline" size={15} />
            </Link>
            <Link
              to="/workspace"
              className="rounded-lg border border-border px-5 py-3 text-sm text-muted hover:bg-surface-hover"
            >
              Browse sections
            </Link>
          </div>
        </div>

        <div className="h-[370px] min-h-0 rounded-3xl border border-border bg-surface/55 shadow-panel">
          <Suspense
            fallback={
              <div className="grid h-full place-items-center text-sm text-muted">
                Booting scene…
              </div>
            }
          >
            <HeroScene />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
