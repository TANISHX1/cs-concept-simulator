import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  SimulationControls,
  type SimulationSpeed,
} from "../../../../components/ui/SimulationControls";
import type { TraceableSimulationProps } from "../../../../lib/types";

type GraphNode = { id: string; x: number; y: number };
type Edge = [number, number];
type State = {
  discovered: number[];
  queue: number[];
  current: number;
  level: number;
  discoveredNow: number[];
  description: string;
};

const nodes: GraphNode[] = [
  { id: "A", x: 250, y: 48 },
  { id: "B", x: 126, y: 154 },
  { id: "C", x: 374, y: 154 },
  { id: "D", x: 54, y: 282 },
  { id: "E", x: 202, y: 282 },
  { id: "F", x: 386, y: 282 },
  { id: "G", x: 202, y: 406 },
];

const edges: Edge[] = [
  [0, 1],
  [0, 2],
  [1, 3],
  [1, 4],
  [2, 5],
  [4, 6],
];

// Each state maps one-to-one to trace.json so the graph, queue, and code trace
// explain the same algorithm event.
const states: State[] = [
  {
    discovered: [0],
    queue: [0],
    current: -1,
    level: 0,
    discoveredNow: [0],
    description: "Mark A discovered and seed the queue.",
  },
  {
    discovered: [0],
    queue: [],
    current: 0,
    level: 0,
    discoveredNow: [],
    description: "Dequeue A and inspect every neighbor at level 1.",
  },
  {
    discovered: [0, 1, 2],
    queue: [1, 2],
    current: 0,
    level: 0,
    discoveredNow: [1, 2],
    description: "Discover B and C, then append them to the frontier.",
  },
  {
    discovered: [0, 1, 2],
    queue: [2],
    current: 1,
    level: 1,
    discoveredNow: [],
    description: "Dequeue B. FIFO order keeps C waiting behind it.",
  },
  {
    discovered: [0, 1, 2, 3, 4],
    queue: [2, 3, 4],
    current: 1,
    level: 1,
    discoveredNow: [3, 4],
    description: "B discovers D and E; they join the back of the queue.",
  },
  {
    discovered: [0, 1, 2, 3, 4],
    queue: [3, 4],
    current: 2,
    level: 1,
    discoveredNow: [],
    description: "Dequeue C after every earlier frontier node.",
  },
  {
    discovered: [0, 1, 2, 3, 4, 5],
    queue: [3, 4, 5],
    current: 2,
    level: 1,
    discoveredNow: [5],
    description: "C discovers F and appends it behind D and E.",
  },
  {
    discovered: [0, 1, 2, 3, 4, 5],
    queue: [4, 5],
    current: 3,
    level: 2,
    discoveredNow: [],
    description: "Dequeue D. Its only neighbor, B, was already discovered.",
  },
  {
    discovered: [0, 1, 2, 3, 4, 5],
    queue: [5],
    current: 4,
    level: 2,
    discoveredNow: [],
    description: "Dequeue E and inspect the next unvisited branch.",
  },
  {
    discovered: [0, 1, 2, 3, 4, 5, 6],
    queue: [5, 6],
    current: 4,
    level: 2,
    discoveredNow: [6],
    description: "E discovers G, the final frontier node.",
  },
  {
    discovered: [0, 1, 2, 3, 4, 5, 6],
    queue: [6],
    current: 5,
    level: 2,
    discoveredNow: [],
    description: "Dequeue F. C is already discovered, so nothing is added.",
  },
  {
    discovered: [0, 1, 2, 3, 4, 5, 6],
    queue: [],
    current: 6,
    level: 3,
    discoveredNow: [],
    description: "Dequeue G. The frontier is empty; traversal is complete.",
  },
];

type NodeStatus = "active" | "frontier" | "visited" | "unseen";

export default function BfsSimulation({
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
    }, 850 / speed);

    return () => window.clearInterval(intervalId);
  }, [externalStep, playing, speed]);

  const currentStep = Math.max(
    0,
    Math.min(states.length - 1, externalStep ?? step),
  );
  const current = states[currentStep];

  const nodeStatus = (index: number): NodeStatus => {
    if (index === current.current) return "active";
    if (current.queue.includes(index)) return "frontier";
    if (current.discovered.includes(index)) return "visited";
    return "unseen";
  };

  const nodeFill = (status: NodeStatus) => {
    if (status === "active") return "var(--accent-algorithms)";
    if (status === "frontier") {
      return "color-mix(in srgb, var(--accent-algorithms) 68%, var(--background))";
    }
    if (status === "visited") {
      return "color-mix(in srgb, var(--accent-algorithms) 23%, var(--surface))";
    }
    return "var(--surface)";
  };

  const nodeStroke = (status: NodeStatus) => {
    if (status === "unseen") return "var(--border)";
    return "var(--accent-algorithms)";
  };

  const nodeText = (status: NodeStatus) =>
    status === "active" || status === "frontier"
      ? "var(--background)"
      : status === "visited"
        ? "var(--foreground)"
        : "var(--foreground-muted)";

  const queueLabels = useMemo(
    () => current.queue.map((index) => nodes[index].id),
    [current.queue],
  );

  return (
    <div className="p-0">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">BFS traversal</h3>
          <p className="mt-1 max-w-xl text-sm text-muted">{current.description}</p>
        </div>
        {externalStep === undefined ? (
          <span className="rounded-full border border-border px-3 py-1 font-mono text-xs text-muted">
            step {currentStep + 1}/{states.length}
          </span>
        ) : null}
      </div>

      <div className="relative mx-auto h-[23rem] w-full max-w-[34rem] sm:h-[27rem]">
        <svg
          viewBox="0 0 500 450"
          className="h-full w-full overflow-visible"
          role="img"
          aria-label={`Breadth-first-search graph. ${current.description}`}
        >
          <title>Breadth-first search traversal graph</title>
          {edges.map(([from, to]) => {
            const tracesActiveNode = from === current.current || to === current.current;
            const isDiscoveryEdge =
              from === current.current && current.discoveredNow.includes(to);
            const isKnownEdge =
              current.discovered.includes(from) && current.discovered.includes(to);

            return (
              <motion.line
                key={`${from}-${to}`}
                x1={nodes[from].x}
                y1={nodes[from].y}
                x2={nodes[to].x}
                y2={nodes[to].y}
                animate={{
                  stroke: isDiscoveryEdge
                    ? "var(--accent-algorithms)"
                    : tracesActiveNode
                      ? "color-mix(in srgb, var(--accent-algorithms) 55%, var(--border))"
                      : isKnownEdge
                        ? "color-mix(in srgb, var(--accent-algorithms) 32%, var(--border))"
                        : "var(--border)",
                  strokeWidth: isDiscoveryEdge ? 3 : tracesActiveNode ? 2.25 : 1.5,
                  opacity: isKnownEdge || tracesActiveNode ? 1 : 0.62,
                }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              />
            );
          })}

          {nodes.map((node, index) => {
            const status = nodeStatus(index);
            const isCurrent = status === "active";
            const justDiscovered = current.discoveredNow.includes(index);

            return (
              <g key={node.id}>
                {isCurrent || justDiscovered ? (
                  <motion.circle
                    cx={node.x}
                    cy={node.y}
                    fill="none"
                    stroke="var(--accent-algorithms)"
                    initial={{ r: 24, opacity: 0.45 }}
                    animate={{ r: isCurrent ? 33 : 29, opacity: isCurrent ? 0.48 : 0.3 }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                  />
                ) : null}
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  animate={{
                    r: isCurrent ? 25 : 21,
                    fill: nodeFill(status),
                    stroke: nodeStroke(status),
                    strokeWidth: isCurrent ? 3 : status === "unseen" ? 1.5 : 2,
                    opacity: status === "unseen" ? 0.78 : 1,
                  }}
                  transition={{ type: "spring", stiffness: 280, damping: 22 }}
                />
                <text
                  x={node.x}
                  y={node.y + 5}
                  fill={nodeText(status)}
                  textAnchor="middle"
                  className="select-none font-mono text-[14px] font-bold"
                >
                  {node.id}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-2 grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-xl border border-border px-3.5 py-3" aria-label="BFS queue frontier">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted">
              Queue frontier
            </span>
            <span className="font-mono text-xs text-muted">front →</span>
          </div>
          <div className="mt-2 flex min-h-7 flex-wrap items-center gap-1.5">
            {queueLabels.length > 0 ? (
              queueLabels.map((label, index) => (
                <motion.span
                  key={`${label}-${index}`}
                  layout
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-md border border-accent-algorithms/40 bg-accent-algorithms/15 px-2 py-1 font-mono text-xs font-semibold text-accent-algorithms"
                >
                  {label}
                </motion.span>
              ))
            ) : (
              <span className="font-mono text-xs italic text-muted">empty</span>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-border px-3.5 py-3" aria-label="BFS traversal state">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted">
            Traversal state
          </p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <span className="block font-mono text-xs text-muted">discovered</span>
              <strong className="font-mono text-base text-foreground">
                {current.discovered.length}/{nodes.length}
              </strong>
            </div>
            <div className="text-right">
              <span className="block font-mono text-xs text-muted">layer</span>
              <strong className="font-mono text-base text-accent-algorithms">
                {current.level}
              </strong>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[0.65rem] text-muted">
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-accent-algorithms" />active</span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full border border-accent-algorithms bg-accent-algorithms/45" />frontier</span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full border border-accent-algorithms bg-surface" />discovered</span>
      </div>

      {externalStep === undefined ? (
        <div className="mt-4">
          <SimulationControls
            isPlaying={playing}
            speed={speed}
            canStepBack={step > 0}
            canStepForward={step < states.length - 1}
            onPlayPause={() => setPlaying((currentValue) => !currentValue)}
            onStepBack={() => setStep((currentValue) => Math.max(0, currentValue - 1))}
            onStepForward={() =>
              setStep((currentValue) => Math.min(states.length - 1, currentValue + 1))
            }
            onReset={() => {
              setStep(0);
              setPlaying(false);
            }}
            onSpeedChange={setSpeed}
          />
        </div>
      ) : null}
    </div>
  );
}
