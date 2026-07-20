import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  SimulationControls,
  type SimulationSpeed,
} from "../../../../components/ui/SimulationControls";
import type { TraceableSimulationProps } from "../../../../lib/types";

type CacheEvent = "fill" | "hit" | "evict";

type CacheState = {
  access: number;
  cache: number[];
  previousCache: number[];
  evicted: number | null;
  event: CacheEvent;
  phase: string;
  description: string;
};

const ACCESS_SEQUENCE = [1, 2, 3, 4, 1, 5, 2, 6, 3, 4];
const CAPACITY = 4;

function buildStates(): CacheState[] {
  const cache: number[] = [];

  return ACCESS_SEQUENCE.map((page) => {
    const previousCache = [...cache];
    const position = cache.indexOf(page);
    let evicted: number | null = null;
    let event: CacheEvent = "fill";
    let phase = "Cold miss";
    let description = "Page " + page + " is not cached. Put it at the MRU end.";

    if (position >= 0) {
      cache.splice(position, 1);
      cache.unshift(page);
      event = "hit";
      phase = "Cache hit";
      description =
        "Page " +
        page +
        " is already cached, so promote it from position " +
        (position + 1) +
        " to MRU.";
    } else {
      if (cache.length === CAPACITY) {
        evicted = cache.pop() ?? null;
        event = "evict";
        phase = "Full cache miss";
        description =
          "Page " +
          page +
          " misses. Evict page " +
          evicted +
          ", the LRU entry, then insert " +
          page +
          " at MRU.";
      }

      cache.unshift(page);
    }

    return {
      access: page,
      cache: [...cache],
      previousCache,
      evicted,
      event,
      phase,
      description,
    };
  });
}

const states = buildStates();

function eventTone(event: CacheEvent) {
  if (event === "hit") return "border-success/40 bg-success/10 text-success";
  if (event === "evict") return "border-error/40 bg-error/10 text-error";
  return "border-warning/40 bg-warning/10 text-warning";
}

function eventLabel(event: CacheEvent) {
  if (event === "hit") return "hit";
  if (event === "evict") return "miss + eviction";
  return "miss";
}

export default function LRUCacheSimulation({
  externalStep,
}: TraceableSimulationProps = {}) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<SimulationSpeed>(1);

  useEffect(() => {
    if (!playing || externalStep !== undefined) return undefined;

    const intervalId = window.setInterval(() => {
      setStep((currentStep) => {
        if (currentStep >= states.length - 1) {
          setPlaying(false);
          return currentStep;
        }

        return currentStep + 1;
      });
    }, 760 / speed);

    return () => window.clearInterval(intervalId);
  }, [externalStep, playing, speed]);

  const currentStep = Math.max(
    0,
    Math.min(states.length - 1, externalStep ?? step),
  );
  const current = states[currentStep];

  return (
    <div className="p-0">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="text-lg font-semibold">LRU page cache</h3>
            <span className="rounded-full border border-accent-os/40 bg-accent-os/10 px-2.5 py-1 font-mono text-[0.66rem] uppercase tracking-[0.12em] text-accent-os">
              capacity {CAPACITY}
            </span>
          </div>
          <p className="mt-1 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-accent-os">
            {current.phase}
          </p>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted" aria-live="polite">
            {current.description}
          </p>
        </div>
        {externalStep === undefined ? (
          <span className="rounded-full border border-border bg-background px-3 py-1 font-mono text-xs text-muted">
            access {currentStep + 1}/{states.length}
          </span>
        ) : null}
      </div>

      <section
        className="rounded-xl border border-border bg-surface/30 p-4 sm:p-5"
        aria-label="LRU cache state"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-mono text-[0.64rem] uppercase tracking-[0.14em] text-muted">
              Access request
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-sm text-muted">page</span>
              <motion.strong
                key={current.access}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-mono text-xl text-accent-os"
              >
                {current.access}
              </motion.strong>
              <span
                className={"rounded-full border px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-[0.1em] " + eventTone(current.event)}
              >
                {eventLabel(current.event)}
              </span>
            </div>
          </div>
          {current.evicted !== null ? (
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-lg border border-error/40 bg-error/10 px-3 py-2"
            >
              <span className="block font-mono text-[0.6rem] uppercase tracking-[0.12em] text-error">
                Evicted LRU
              </span>
              <strong className="mt-0.5 block font-mono text-sm text-foreground">
                page {current.evicted}
              </strong>
            </motion.div>
          ) : (
            <span className="font-mono text-[0.68rem] text-muted">
              {current.event === "hit" ? "No disk lookup needed" : "Free slot available"}
            </span>
          )}
        </div>

        <div className="mt-5 overflow-x-auto pb-1">
          <div className="min-w-[30rem]">
            <div className="mb-2 flex items-center justify-between font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted">
              <span>Most recently used</span>
              <span>Least recently used</span>
            </div>
            <div className="flex items-stretch gap-2">
              {current.cache.map((page, index) => {
                const isMru = index === 0;
                const isLru = index === current.cache.length - 1;
                const wasRecentlyAccessed = page === current.access;
                const wasInCache = current.previousCache.includes(page);

                return (
                  <motion.article
                    key={page}
                    layout="position"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{
                      opacity: 1,
                      y: wasRecentlyAccessed ? -4 : 0,
                      scale: wasRecentlyAccessed ? 1.035 : 1,
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 24 }}
                    className={
                      "relative flex min-h-24 min-w-24 flex-1 flex-col justify-between overflow-hidden rounded-xl border p-3 " +
                      (wasRecentlyAccessed
                        ? "border-accent-os bg-accent-os/15"
                        : isLru
                          ? "border-warning/40 bg-warning/5"
                          : "border-border bg-background")
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[0.58rem] uppercase tracking-[0.1em] text-muted">
                        {isMru ? "MRU" : isLru ? "LRU" : "cached"}
                      </span>
                      {wasRecentlyAccessed && wasInCache ? (
                        <span className="font-mono text-[0.56rem] uppercase tracking-[0.08em] text-success">
                          promoted
                        </span>
                      ) : null}
                    </div>
                    <strong
                      className={
                        "font-mono text-2xl " +
                        (wasRecentlyAccessed
                          ? "text-accent-os"
                          : isLru
                            ? "text-warning"
                            : "text-foreground")
                      }
                    >
                      {page}
                    </strong>
                    <span className="font-mono text-[0.58rem] text-muted">
                      slot {index + 1}
                    </span>
                    {wasRecentlyAccessed ? (
                      <motion.span
                        aria-hidden="true"
                        initial={{ opacity: 0.1, scaleX: 0.4 }}
                        animate={{ opacity: 0.72, scaleX: 1 }}
                        className="absolute inset-x-3 bottom-0 h-0.5 origin-left bg-accent-os"
                      />
                    ) : null}
                  </motion.article>
                );
              })}

              {Array.from({ length: CAPACITY - current.cache.length }).map((_, index) => (
                <div
                  key={"empty-" + index}
                  className="flex min-h-24 min-w-24 flex-1 flex-col justify-between rounded-xl border border-dashed border-border bg-background/40 p-3"
                >
                  <span className="font-mono text-[0.58rem] uppercase tracking-[0.1em] text-muted">
                    available
                  </span>
                  <span className="font-mono text-xl text-muted">·</span>
                  <span className="font-mono text-[0.58rem] text-muted">empty</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3 font-mono text-[0.64rem] text-muted">
          <span className="flex items-center gap-1.5">
            <i className="h-2 w-2 rounded-full bg-accent-os" />
            accessed / MRU
          </span>
          <span className="flex items-center gap-1.5">
            <i className="h-2 w-2 rounded-full border border-warning bg-warning/20" />
            eviction candidate
          </span>
          <span>order changes on every access</span>
        </div>
      </section>

      <section className="mt-4" aria-label="Page access timeline">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="font-mono text-[0.64rem] uppercase tracking-[0.14em] text-muted">
            Page access timeline
          </span>
          <span className="font-mono text-[0.64rem] text-muted">
            {ACCESS_SEQUENCE.join(" → ")}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          {states.map((state, index) => {
            const isCurrent = index === currentStep;
            const chipClass =
              "flex min-h-12 flex-col items-center justify-center rounded-lg border font-mono transition " +
              (isCurrent
                ? "border-accent-os bg-accent-os/15 text-accent-os"
                : state.event === "hit"
                  ? "border-success/25 bg-success/5 text-success"
                  : state.event === "evict"
                    ? "border-error/25 bg-error/5 text-error"
                    : "border-border bg-background text-muted");

            const label = "Access " + (index + 1) + ": page " + state.access + ", " + eventLabel(state.event);

            if (externalStep !== undefined) {
              return (
                <span
                  key={index}
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={label}
                  className={chipClass}
                >
                  <strong className="text-sm">{state.access}</strong>
                  <small className="mt-0.5 text-[0.55rem] uppercase tracking-[0.08em]">
                    {state.event === "evict" ? "evict" : state.event}
                  </small>
                </span>
              );
            }

            return (
              <button
                key={index}
                type="button"
                onClick={() => {
                  setStep(index);
                  setPlaying(false);
                }}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={label}
                className={chipClass + " hover:border-accent-os/60 hover:text-foreground"}
              >
                <strong className="text-sm">{state.access}</strong>
                <small className="mt-0.5 text-[0.55rem] uppercase tracking-[0.08em]">
                  {state.event === "evict" ? "evict" : state.event}
                </small>
              </button>
            );
          })}
        </div>
      </section>

      {externalStep === undefined ? (
        <SimulationControls
          isPlaying={playing}
          speed={speed}
          canStepBack={step > 0}
          canStepForward={step < states.length - 1}
          onPlayPause={() => setPlaying((currentPlaying) => !currentPlaying)}
          onStepBack={() => setStep((currentStep) => Math.max(0, currentStep - 1))}
          onStepForward={() =>
            setStep((currentStep) => Math.min(states.length - 1, currentStep + 1))
          }
          onReset={() => {
            setStep(0);
            setPlaying(false);
          }}
          onSpeedChange={setSpeed}
        />
      ) : null}
    </div>
  );
}
