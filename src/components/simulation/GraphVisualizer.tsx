import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  SimulationControls,
  type SimulationSpeed,
} from "../ui/SimulationControls";
import type { SimulationSpec } from "../../lib/simulationSpec";
import { useRequiredActiveSimulation } from "./ActiveSimulationContext";

type GraphSimulationSpec = Extract<
  SimulationSpec,
  { visualType: "graph" }
>;

export type GraphVisualizerProps = {
  spec: GraphSimulationSpec;
};

type PositionedNode = GraphSimulationSpec["initialState"]["nodes"][number] & {
  x: number;
  y: number;
};

type GraphVisualState = {
  visitedNodeIds: Set<string>;
  traversedEdgeIds: Set<string>;
  activeNodeIds: Set<string>;
  activeEdgeId: string | null;
};

const graphSpringTransition = {
  type: "spring",
  stiffness: 280,
  damping: 24,
} as const;

function getEdgeId(from: string, to: string) {
  return `${from}\u0000${to}`;
}

function createRadialLayout(
  nodes: GraphSimulationSpec["initialState"]["nodes"],
): PositionedNode[] {
  if (nodes.length === 1) {
    return [{ ...nodes[0], x: 50, y: 50 }];
  }

  const radius = 36;

  return nodes.map((node, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / nodes.length;

    return {
      ...node,
      x: 50 + radius * Math.cos(angle),
      y: 50 + radius * Math.sin(angle),
    };
  });
}

function getGraphVisualState(
  spec: GraphSimulationSpec,
  currentStep: number,
): GraphVisualState {
  const visitedNodeIds = new Set<string>();
  const traversedEdgeIds = new Set<string>();
  let activeNodeIds = new Set<string>();
  let activeEdgeId: string | null = null;

  for (const step of spec.steps.slice(0, currentStep)) {
    switch (step.type) {
      case "VISIT_NODE":
        visitedNodeIds.add(step.id);
        activeNodeIds = new Set([step.id]);
        activeEdgeId = null;
        break;
      case "TRAVERSE_EDGE": {
        const edgeId = getEdgeId(step.from, step.to);
        traversedEdgeIds.add(edgeId);
        activeNodeIds = new Set([step.from, step.to]);
        activeEdgeId = edgeId;
        break;
      }
      case "HIGHLIGHT":
        activeNodeIds = new Set(step.ids);
        activeEdgeId = null;
        break;
    }
  }

  return {
    visitedNodeIds,
    traversedEdgeIds,
    activeNodeIds,
    activeEdgeId,
  };
}

export function GraphVisualizer({ spec }: GraphVisualizerProps) {
  const {
    conceptId,
    currentStep,
    setStep,
    isPlaying,
    setIsPlaying,
    setGroundingContext,
  } =
    useRequiredActiveSimulation();
  const [speed, setSpeed] = useState<SimulationSpeed>(1);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isPlaying) return;

    const intervalId = window.setInterval(() => {
      setStep((current) => {
        const next = Math.min(current + 1, spec.steps.length);

        if (next === spec.steps.length) {
          setIsPlaying(false);
        }

        return next;
      });
    }, 650 / speed);

    return () => window.clearInterval(intervalId);
  }, [isPlaying, setIsPlaying, setStep, speed, spec.steps.length]);

  const positionedNodes = useMemo(
    () => createRadialLayout(spec.initialState.nodes),
    [spec.initialState.nodes],
  );
  const nodesById = useMemo(
    () => new Map(positionedNodes.map((node) => [node.id, node])),
    [positionedNodes],
  );
  const renderedEdges = useMemo(
    () =>
      spec.initialState.edges.flatMap((edge, index) => {
        const from = nodesById.get(edge.from);
        const to = nodesById.get(edge.to);

        return from && to ? [{ ...edge, from, to, index }] : [];
      }),
    [nodesById, spec.initialState.edges],
  );
  const {
    visitedNodeIds,
    traversedEdgeIds,
    activeNodeIds,
    activeEdgeId,
  } = useMemo(
    () => getGraphVisualState(spec, currentStep),
    [currentStep, spec],
  );
  const activeEdge = renderedEdges.find(
    (edge) => getEdgeId(edge.from.id, edge.to.id) === activeEdgeId,
  );

  const reset = () => {
    setStep(0);
    setIsPlaying(false);
  };
  const transition = prefersReducedMotion
    ? { duration: 0 }
    : graphSpringTransition;
  const selectNode = (node: PositionedNode) => {
    setGroundingContext({
      conceptId,
      currentStep,
      stateSnapshot: {
        visualType: "graph",
        selectedNode: { id: node.id, label: node.label },
        visitedNodeIds: [...visitedNodeIds],
        activeNodeIds: [...activeNodeIds],
        traversedEdges: spec.initialState.edges
          .filter((edge) => traversedEdgeIds.has(getEdgeId(edge.from, edge.to)))
          .map(({ from, to }) => ({ from, to })),
      },
    });
  };

  return (
    <div className="p-0">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{spec.title}</h3>
          <p className="text-sm text-muted">Graph traversal</p>
        </div>
        <span className="shrink-0 rounded-full bg-background px-3 py-1 font-mono text-xs text-muted">
          step {currentStep}/{spec.steps.length}
        </span>
      </div>

      <div
        className="relative mx-auto aspect-[4/3] w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-surface/40"
        role="img"
        aria-label={`${spec.title} graph visualization`}
      >
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {renderedEdges.map((edge) => {
            const edgeId = getEdgeId(edge.from.id, edge.to.id);
            const isTraversed = traversedEdgeIds.has(edgeId);

            return (
              <motion.line
                key={`${edgeId}-${edge.index}`}
                x1={edge.from.x}
                y1={edge.from.y}
                x2={edge.to.x}
                y2={edge.to.y}
                stroke={
                  isTraversed
                    ? "var(--graph-edge-traversed)"
                    : "var(--border)"
                }
                strokeLinecap="round"
                animate={{
                  opacity: isTraversed ? 0.95 : 0.7,
                  strokeWidth: isTraversed ? 2.4 : 1.35,
                }}
                transition={transition}
              />
            );
          })}
          {activeEdge && (
            <motion.path
              key={`${getEdgeId(activeEdge.from.id, activeEdge.to.id)}-${currentStep}`}
              d={`M ${activeEdge.from.x} ${activeEdge.from.y} L ${activeEdge.to.x} ${activeEdge.to.y}`}
              fill="none"
              stroke="var(--accent-algorithms)"
              strokeWidth="3.4"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0.35 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={transition}
            />
          )}
        </svg>

        {positionedNodes.map((node) => {
          const isActive = activeNodeIds.has(node.id);
          const isVisited = visitedNodeIds.has(node.id);
          const backgroundColor = isActive
            ? "var(--graph-node-active)"
            : isVisited
              ? "var(--graph-node-visited)"
              : "var(--graph-node-surface)";
          const borderColor = isActive
            ? "var(--graph-node-active-border)"
            : "var(--border)";
          const boxShadow = isActive
            ? "var(--graph-node-active-shadow)"
            : "var(--graph-node-shadow)";

          return (
            <div
              key={node.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              <motion.div
                role="button"
                tabIndex={0}
                aria-label={`Select node ${node.label}`}
                onClick={() => selectNode(node)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    selectNode(node);
                  }
                }}
                className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border px-2 text-center font-mono text-xs font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent-algorithms"
                style={{
                  backgroundColor,
                  backdropFilter: "blur(var(--graph-node-backdrop-blur))",
                  borderColor,
                  boxShadow,
                }}
                animate={{
                  opacity: isVisited || isActive ? 1 : 0.72,
                  scale: isActive ? 1.12 : isVisited ? 1.04 : 1,
                }}
                transition={transition}
              >
                <span className="max-w-full truncate">{node.label}</span>
              </motion.div>
            </div>
          );
        })}
      </div>

      <SimulationControls
        isPlaying={isPlaying}
        speed={speed}
        canStepBack={currentStep > 0}
        canStepForward={currentStep < spec.steps.length}
        onPlayPause={() => setIsPlaying((playing) => !playing)}
        onStepBack={() =>
          setStep((current) => Math.max(0, current - 1))
        }
        onStepForward={() =>
          setStep((current) => Math.min(spec.steps.length, current + 1))
        }
        onReset={reset}
        onSpeedChange={setSpeed}
      />
    </div>
  );
}
