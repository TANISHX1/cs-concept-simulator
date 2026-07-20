import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  SimulationControls,
  type SimulationSpeed,
} from "../../../components/ui/SimulationControls";
import type { TraceableSimulationProps } from "../../../lib/types";

type NodeId = "browser" | "resolver" | "root" | "tld" | "authority";
type FlowKind = "query" | "reply";
type ResolutionMode = "recursive" | "iterative";

type Packet = {
  from: NodeId;
  to: NodeId;
  label: string;
  detail: string;
  kind: FlowKind;
};

type ComparisonStep = {
  recursive: Packet | null;
  iterative: Packet | null;
  caption: string;
};

type Position = { x: number; y: number };

const CLIENT_FLOW = "var(--network-client-flow)";
const SERVER_FLOW = "var(--network-server-flow)";
const QUESTION_DETAIL = "QNAME example.com · TYPE A";
const ANSWER_DETAIL = "A 93.184.216.34 · TTL 3600 s";

const NODE_NAMES: Record<NodeId, string> = {
  browser: "Browser",
  resolver: "Resolver",
  root: "Root",
  tld: ".com",
  authority: "Authority",
};

const NODE_POSITIONS: Record<NodeId, Position> = {
  browser: { x: 70, y: 272 },
  resolver: { x: 190, y: 255 },
  root: { x: 275, y: 83 },
  tld: { x: 425, y: 150 },
  authority: { x: 390, y: 292 },
};

const NODES: Array<{ id: NodeId; label: string; detail: string }> = [
  { id: "browser", label: "Browser", detail: "CLIENT" },
  { id: "resolver", label: "Resolver", detail: "CACHE + RECURSION" },
  { id: "root", label: "Root", detail: "DNS ROOT" },
  { id: "tld", label: ".com", detail: "TLD ZONE" },
  { id: "authority", label: "Authority", detail: "AUTH SERVER" },
];

const STEPS: ComparisonStep[] = [
  {
    recursive: null,
    iterative: null,
    caption: "Both start with the same A query for example.com.",
  },
  {
    recursive: { from: "browser", to: "resolver", label: "A query", detail: QUESTION_DETAIL, kind: "query" },
    iterative: { from: "browser", to: "resolver", label: "A query", detail: QUESTION_DETAIL, kind: "query" },
    caption: "The browser asks its resolver in both models.",
  },
  {
    recursive: { from: "resolver", to: "root", label: "A query", detail: QUESTION_DETAIL, kind: "query" },
    iterative: { from: "resolver", to: "root", label: "A query", detail: QUESTION_DETAIL, kind: "query" },
    caption: "Both reach the root; the next response creates the difference.",
  },
  {
    recursive: { from: "root", to: "tld", label: "A query", detail: QUESTION_DETAIL, kind: "query" },
    iterative: { from: "root", to: "resolver", label: ".com referral", detail: "NS a.gtld-servers.net", kind: "reply" },
    caption: "Recursive: the root forwards the query. Iterative: it returns a .com referral.",
  },
  {
    recursive: { from: "tld", to: "authority", label: "A query", detail: QUESTION_DETAIL, kind: "query" },
    iterative: { from: "resolver", to: "tld", label: "A query", detail: QUESTION_DETAIL, kind: "query" },
    caption: "Recursive forwarding continues; iterative resolution has the resolver ask .com itself.",
  },
  {
    recursive: { from: "authority", to: "tld", label: "A answer", detail: ANSWER_DETAIL, kind: "reply" },
    iterative: { from: "tld", to: "resolver", label: "NS referral", detail: "NS ns.example.com", kind: "reply" },
    caption: "The authority begins returning A 93.184.216.34, while .com gives the iterative resolver another referral.",
  },
  {
    recursive: { from: "tld", to: "root", label: "A answer", detail: ANSWER_DETAIL, kind: "reply" },
    iterative: { from: "resolver", to: "authority", label: "A query", detail: QUESTION_DETAIL, kind: "query" },
    caption: "Recursive replies travel back up the chain; the iterative resolver now contacts the authority.",
  },
  {
    recursive: { from: "root", to: "resolver", label: "A answer", detail: ANSWER_DETAIL, kind: "reply" },
    iterative: { from: "authority", to: "resolver", label: "A answer", detail: ANSWER_DETAIL, kind: "reply" },
    caption: "Both resolvers receive the final address, 93.184.216.34, but by different paths.",
  },
  {
    recursive: { from: "resolver", to: "browser", label: "A answer", detail: ANSWER_DETAIL, kind: "reply" },
    iterative: { from: "resolver", to: "browser", label: "A answer", detail: ANSWER_DETAIL, kind: "reply" },
    caption: "Both models finish by returning 93.184.216.34 to the browser.",
  },
];

function pairKey(from: NodeId, to: NodeId) {
  return [from, to].sort().join("-");
}

function directPath(from: Position, to: Position) {
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
}

function quadraticPoint(from: Position, control: Position, to: Position, progress: number) {
  const inverse = 1 - progress;
  return {
    x: inverse * inverse * from.x + 2 * inverse * progress * control.x + progress * progress * to.x,
    y: inverse * inverse * from.y + 2 * inverse * progress * control.y + progress * progress * to.y,
  };
}

function activePath(mode: ResolutionMode, packet: Packet) {
  const from = NODE_POSITIONS[packet.from];
  const to = NODE_POSITIONS[packet.to];
  const key = pairKey(packet.from, packet.to);
  const controls: Partial<Record<string, Position>> = mode === "iterative"
    ? {
        "resolver-tld": { x: 300, y: 198 },
        "authority-resolver": { x: 295, y: 350 },
      }
    : {};
  const control = controls[key];

  if (control) {
    return {
      path: `M ${from.x} ${from.y} Q ${control.x} ${control.y} ${to.x} ${to.y}`,
      packetPosition: quadraticPoint(from, control, to, 0.52),
    };
  }

  return {
    path: directPath(from, to),
    packetPosition: {
      x: from.x + (to.x - from.x) * 0.52,
      y: from.y + (to.y - from.y) * 0.52,
    },
  };
}

function NodeArtwork({ id, stroke }: { id: NodeId; stroke: string }) {
  const common = {
    fill: "none",
    stroke,
    strokeWidth: 1.65,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (id === "browser") {
    return (
      <g {...common}>
        <rect x="-19" y="-29" width="38" height="25" rx="3" />
        <path d="M-9 9h18M0-4V9" />
        <path d="M-14-20h28" opacity="0.42" />
      </g>
    );
  }

  if (id === "root") {
    return (
      <g {...common}>
        <circle cx="0" cy="-14" r="20" />
        <path d="M-20-14h40M0-34c8 9 8 29 0 40M0-34c-8 9-8 29 0 40" />
        <path d="M-14-25c8 4 20 4 28 0M-14-3c8-4 20-4 28 0" opacity="0.6" />
      </g>
    );
  }

  if (id === "resolver") {
    return (
      <g {...common}>
        <rect x="-21" y="-31" width="42" height="39" rx="4" />
        <path d="M-21-18h42M-21-5h42" opacity="0.5" />
        <circle cx="-13" cy="-24" r="1.2" fill={stroke} stroke="none" />
        <circle cx="-13" cy="-11" r="1.2" fill={stroke} stroke="none" />
        <circle cx="-13" cy="2" r="1.2" fill={stroke} stroke="none" />
        <ellipse cx="13" cy="18" rx="10" ry="3.5" />
        <path d="M3 18v7c0 2 4.5 3.5 10 3.5S23 27 23 25v-7" />
      </g>
    );
  }

  return (
    <g {...common}>
      <rect x="-21" y="-31" width="42" height="43" rx="4" />
      <path d="M-21-16h42M-21-1h42" opacity="0.52" />
      <circle cx="-13" cy="-23.5" r="1.2" fill={stroke} stroke="none" />
      <circle cx="-13" cy="-8.5" r="1.2" fill={stroke} stroke="none" />
      <circle cx="-13" cy="6.5" r="1.2" fill={stroke} stroke="none" />
      <path d="M-6-23.5h17M-6-8.5h17M-6 6.5h17" opacity="0.6" />
    </g>
  );
}

function StaticLink({
  from,
  to,
  label,
  curved = false,
}: {
  from: NodeId;
  to: NodeId;
  label: string;
  curved?: boolean;
}) {
  const start = NODE_POSITIONS[from];
  const end = NODE_POSITIONS[to];
  const control = curved ? (pairKey(from, to) === "resolver-tld" ? { x: 300, y: 198 } : { x: 295, y: 350 }) : null;
  const labelPosition = control
    ? quadraticPoint(start, control, end, 0.5)
    : { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };

  return (
    <g>
      {control ? (
        <path d={`M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`} fill="none" stroke="var(--border)" strokeWidth="1.35" strokeDasharray="4 5" />
      ) : (
        <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="var(--border)" strokeWidth="1.35" strokeDasharray="4 5" />
      )}
      <text
        x={labelPosition.x}
        y={labelPosition.y - 7}
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize="7.5"
        letterSpacing="0.75"
        fill="var(--foreground-muted)"
      >
        {label.toUpperCase()}
      </text>
    </g>
  );
}

function DNSMap({
  mode,
  packet,
  reduceMotion,
}: {
  mode: ResolutionMode;
  packet: Packet | null;
  reduceMotion: boolean | null;
}) {
  const geometry = packet ? activePath(mode, packet) : null;
  const flow = packet?.kind === "reply" ? SERVER_FLOW : CLIENT_FLOW;
  const markerId = packet?.kind === "reply"
    ? `dns-comparison-reply-${mode}`
    : `dns-comparison-query-${mode}`;
  const packetWidth = packet ? Math.max(66, Math.min(108, packet.label.length * 5.6 + 20)) : 94;
  const activeNodes = new Set(packet ? [packet.from, packet.to] : []);

  return (
    <section className="min-w-0 rounded-xl border border-border bg-background/40 p-2.5 sm:p-3" aria-label={`${mode} DNS resolution`}>
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <p className="font-mono text-[0.62rem] uppercase tracking-[0.13em] text-foreground">
          {mode === "recursive" ? "Recursive" : "Iterative"}
        </p>
        <span className="font-mono text-[0.55rem] uppercase tracking-[0.1em] text-muted">
          {mode === "recursive" ? "server forwards" : "resolver asks"}
        </span>
      </div>

      <svg viewBox="0 0 520 380" className="block h-auto w-full" role="img" aria-label={`${mode} DNS topology`}>
        <defs>
          <pattern id={`dns-grid-${mode}`} width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.75" fill="var(--border)" opacity="0.72" />
          </pattern>
          <marker id={`dns-comparison-query-${mode}`} markerWidth="8" markerHeight="8" refX="6.6" refY="4" orient="auto">
            <path d="M0 0L7 4L0 8z" fill={CLIENT_FLOW} />
          </marker>
          <marker id={`dns-comparison-reply-${mode}`} markerWidth="8" markerHeight="8" refX="6.6" refY="4" orient="auto">
            <path d="M0 0L7 4L0 8z" fill={SERVER_FLOW} />
          </marker>
        </defs>

        <rect x="4" y="4" width="512" height="372" rx="13" fill={`url(#dns-grid-${mode})`} opacity="0.44" />
        <rect x="4" y="4" width="512" height="372" rx="13" fill="none" stroke="var(--border)" />

        <StaticLink from="browser" to="resolver" label="browser query" />
        <StaticLink from="resolver" to="root" label="root" />
        <StaticLink from="root" to="tld" label="delegates" />
        <StaticLink from="tld" to="authority" label="delegates" />
        {mode === "iterative" ? (
          <>
            <StaticLink from="resolver" to="tld" label="direct ask" curved />
            <StaticLink from="resolver" to="authority" label="direct ask" curved />
          </>
        ) : null}

        {geometry && packet ? (
          <motion.path
            key={`${mode}-${packet.from}-${packet.to}-${packet.label}`}
            d={geometry.path}
            fill="none"
            stroke={flow}
            strokeWidth="3.1"
            strokeLinecap="round"
            markerEnd={`url(#${markerId})`}
            initial={reduceMotion ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: reduceMotion ? 0 : 0.5, ease: "easeInOut" }}
          />
        ) : null}

        {NODES.map((node) => {
          const position = NODE_POSITIONS[node.id];
          const isActive = activeNodes.has(node.id);
          const stroke = isActive ? flow : "var(--border)";

          return (
            <g key={node.id} transform={`translate(${position.x} ${position.y})`}>
              {isActive ? <circle r="48" fill={flow} opacity="0.07" /> : null}
              <rect x="-46" y="-44" width="92" height="88" rx="10" fill="var(--surface)" fillOpacity="0.92" stroke={stroke} strokeWidth={isActive ? "1.8" : "1.1"} />
              <NodeArtwork id={node.id} stroke={stroke} />
              <text x="0" y="25" textAnchor="middle" fontFamily="var(--font-sans)" fontSize="11.5" fontWeight="650" fill="var(--foreground)">
                {node.label}
              </text>
              <text x="0" y="37" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="6.7" letterSpacing="0.7" fill={isActive ? flow : "var(--foreground-muted)"}>
                {node.detail}
              </text>
            </g>
          );
        })}

        {geometry && packet ? (
          <motion.g
            key={`label-${mode}-${packet.from}-${packet.to}-${packet.label}`}
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reduceMotion ? 0 : 0.24, duration: 0.18 }}
          >
            <rect
              x={geometry.packetPosition.x - packetWidth / 2}
              y={geometry.packetPosition.y - 11}
              width={packetWidth}
              height="22"
              rx="11"
              fill="var(--background)"
              stroke={flow}
              strokeWidth="1.1"
            />
            <text
              x={geometry.packetPosition.x}
              y={geometry.packetPosition.y + 3.4}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize="8.3"
              fontWeight="600"
              fill={flow}
            >
              {packet.label}
            </text>
          </motion.g>
        ) : (
          <g transform="translate(70 203)">
            <rect x="-48" y="-11" width="96" height="22" rx="11" fill="var(--background)" stroke="var(--border)" />
            <text x="0" y="3.4" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="8.3" fill="var(--foreground-muted)">
              A example.com
            </text>
          </g>
        )}
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border px-1 pt-2 font-mono text-[0.62rem] leading-5">
        <span className="uppercase tracking-[0.09em] text-muted">
          {packet ? `${NODE_NAMES[packet.from]} → ${NODE_NAMES[packet.to]}` : "ready"}
        </span>
        <span className="text-foreground">
          {packet?.detail ?? QUESTION_DETAIL}
        </span>
      </div>
    </section>
  );
}

export default function DNSResolutionSimulation({
  externalStep,
}: TraceableSimulationProps = {}) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<SimulationSpeed>(1);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!playing || externalStep !== undefined) return undefined;

    const intervalId = window.setInterval(() => {
      setStep((currentStep) => {
        if (currentStep >= STEPS.length - 1) {
          setPlaying(false);
          return currentStep;
        }

        return currentStep + 1;
      });
    }, 1050 / speed);

    return () => window.clearInterval(intervalId);
  }, [externalStep, playing, speed]);

  const currentStep = Math.max(0, Math.min(STEPS.length - 1, externalStep ?? step));
  const state = STEPS[currentStep];

  return (
    <div className="p-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="text-lg font-semibold text-foreground">DNS: recursive vs iterative</h3>
          <span className="rounded-full border border-accent-networking/35 bg-accent-networking/10 px-2.5 py-1 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-accent-networking">
            same question · different work
          </span>
        </div>
        {externalStep === undefined ? (
          <span className="rounded-full border border-border bg-background px-3 py-1 font-mono text-xs text-muted">
            step {currentStep}/{STEPS.length - 1}
          </span>
        ) : null}
      </div>

      <section aria-label="Recursive and iterative DNS comparison">
        <div className="grid gap-3 lg:grid-cols-2">
          <DNSMap mode="recursive" packet={state.recursive} reduceMotion={reduceMotion} />
          <DNSMap mode="iterative" packet={state.iterative} reduceMotion={reduceMotion} />
        </div>
        <p className="mt-3 rounded-lg border border-border bg-surface/20 px-3 py-2.5 text-sm leading-6 text-foreground" aria-live="polite">
          <span className="mr-2 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-accent-networking">comparison</span>
          {state.caption}
        </p>
      </section>

      {externalStep === undefined ? (
        <SimulationControls
          isPlaying={playing}
          speed={speed}
          canStepBack={step > 0}
          canStepForward={step < STEPS.length - 1}
          onPlayPause={() => setPlaying((currentPlaying) => !currentPlaying)}
          onStepBack={() => setStep((currentStep) => Math.max(0, currentStep - 1))}
          onStepForward={() => setStep((currentStep) => Math.min(STEPS.length - 1, currentStep + 1))}
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
