import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  SimulationControls,
  type SimulationSpeed,
} from "../../../components/ui/SimulationControls";
import type { TraceableSimulationProps } from "../../../lib/types";

type PacketDirection = "client-to-server" | "server-to-client";
type Endpoint = "client" | "server";
type ClientBandId =
  | "client-closed"
  | "client-syn-sent"
  | "client-established"
  | "client-fin-wait-1"
  | "client-fin-wait-2"
  | "client-time-wait"
  | "client-finished";
type ServerBandId =
  | "server-listen"
  | "server-syn-rcvd"
  | "server-established"
  | "server-close-wait"
  | "server-last-ack"
  | "server-finished";

type Packet = {
  name: "SYN" | "SYN + ACK" | "ACK" | "FIN";
  detail: string;
  direction: PacketDirection;
  flags: string[];
  sequence: string;
  acknowledgement: string;
};

type LifecycleStep = {
  label: string;
  clientBand: ClientBandId;
  serverBand: ServerBandId;
  packet: Packet | null;
};

type StateBand<TId extends string> = {
  id: TId;
  labels: string[];
  from: number;
  to: number;
  phase: "setup" | "transfer" | "termination" | "closed";
};

type PacketPath = Packet & {
  startsAt: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  head: string;
  labelX: number;
  labelY: number;
  labelWidth: number;
};

const LIFECYCLE_STEPS: LifecycleStep[] = [
  { label: "Listen", clientBand: "client-closed", serverBand: "server-listen", packet: null },
  {
    label: "SYN",
    clientBand: "client-syn-sent",
    serverBand: "server-listen",
    packet: { name: "SYN", detail: "seq 1000", direction: "client-to-server", flags: ["SYN"], sequence: "1000", acknowledgement: "—" },
  },
  {
    label: "Receive SYN",
    clientBand: "client-syn-sent",
    serverBand: "server-syn-rcvd",
    packet: { name: "SYN", detail: "seq 1000", direction: "client-to-server", flags: ["SYN"], sequence: "1000", acknowledgement: "—" },
  },
  {
    label: "SYN + ACK",
    clientBand: "client-syn-sent",
    serverBand: "server-syn-rcvd",
    packet: { name: "SYN + ACK", detail: "seq 5000 · ack 1001", direction: "server-to-client", flags: ["SYN", "ACK"], sequence: "5000", acknowledgement: "1001" },
  },
  {
    label: "Validate",
    clientBand: "client-syn-sent",
    serverBand: "server-syn-rcvd",
    packet: { name: "SYN + ACK", detail: "seq 5000 · ack 1001", direction: "server-to-client", flags: ["SYN", "ACK"], sequence: "5000", acknowledgement: "1001" },
  },
  {
    label: "ACK",
    clientBand: "client-established",
    serverBand: "server-syn-rcvd",
    packet: { name: "ACK", detail: "ack 5001", direction: "client-to-server", flags: ["ACK"], sequence: "1001", acknowledgement: "5001" },
  },
  {
    label: "Established",
    clientBand: "client-established",
    serverBand: "server-established",
    packet: { name: "ACK", detail: "ack 5001", direction: "client-to-server", flags: ["ACK"], sequence: "1001", acknowledgement: "5001" },
  },
  { label: "Data transfer", clientBand: "client-established", serverBand: "server-established", packet: null },
  {
    label: "Active close · FIN",
    clientBand: "client-fin-wait-1",
    serverBand: "server-established",
    packet: { name: "FIN", detail: "seq 1001", direction: "client-to-server", flags: ["FIN"], sequence: "1001", acknowledgement: "5001" },
  },
  {
    label: "Receive FIN",
    clientBand: "client-fin-wait-1",
    serverBand: "server-close-wait",
    packet: { name: "FIN", detail: "seq 1001", direction: "client-to-server", flags: ["FIN"], sequence: "1001", acknowledgement: "5001" },
  },
  {
    label: "ACK close",
    clientBand: "client-fin-wait-1",
    serverBand: "server-close-wait",
    packet: { name: "ACK", detail: "ack 1002", direction: "server-to-client", flags: ["ACK"], sequence: "5001", acknowledgement: "1002" },
  },
  {
    label: "ACK received",
    clientBand: "client-fin-wait-2",
    serverBand: "server-close-wait",
    packet: { name: "ACK", detail: "ack 1002", direction: "server-to-client", flags: ["ACK"], sequence: "5001", acknowledgement: "1002" },
  },
  {
    label: "Peer FIN",
    clientBand: "client-fin-wait-2",
    serverBand: "server-last-ack",
    packet: { name: "FIN", detail: "seq 5001", direction: "server-to-client", flags: ["FIN"], sequence: "5001", acknowledgement: "1002" },
  },
  {
    label: "Final ACK",
    clientBand: "client-time-wait",
    serverBand: "server-last-ack",
    packet: { name: "ACK", detail: "ack 5002", direction: "client-to-server", flags: ["ACK"], sequence: "1002", acknowledgement: "5002" },
  },
  {
    label: "Server closed",
    clientBand: "client-time-wait",
    serverBand: "server-finished",
    packet: { name: "ACK", detail: "ack 5002", direction: "client-to-server", flags: ["ACK"], sequence: "1002", acknowledgement: "5002" },
  },
  { label: "TIME_WAIT elapsed", clientBand: "client-finished", serverBand: "server-finished", packet: null },
];

const CLIENT_BANDS: StateBand<ClientBandId>[] = [
  { id: "client-closed", labels: ["CLOSED"], from: 144, to: 176, phase: "closed" },
  { id: "client-syn-sent", labels: ["SYN_SENT"], from: 176, to: 338, phase: "setup" },
  { id: "client-established", labels: ["ESTABLISHED"], from: 338, to: 426, phase: "transfer" },
  { id: "client-fin-wait-1", labels: ["FIN_WAIT_1"], from: 426, to: 462, phase: "termination" },
  { id: "client-fin-wait-2", labels: ["FIN_WAIT_2"], from: 462, to: 526, phase: "termination" },
  { id: "client-time-wait", labels: ["TIME_WAIT"], from: 526, to: 590, phase: "termination" },
  { id: "client-finished", labels: ["CONNECTION", "CLOSED"], from: 590, to: 638, phase: "closed" },
];

const SERVER_BANDS: StateBand<ServerBandId>[] = [
  { id: "server-listen", labels: ["LISTEN"], from: 144, to: 226, phase: "setup" },
  { id: "server-syn-rcvd", labels: ["SYN_RCVD"], from: 226, to: 338, phase: "setup" },
  { id: "server-established", labels: ["ESTABLISHED"], from: 338, to: 476, phase: "transfer" },
  { id: "server-close-wait", labels: ["CLOSE_WAIT"], from: 476, to: 532, phase: "termination" },
  { id: "server-last-ack", labels: ["LAST_ACK"], from: 532, to: 590, phase: "termination" },
  { id: "server-finished", labels: ["CONNECTION", "CLOSED"], from: 590, to: 638, phase: "closed" },
];

const PACKET_PATHS: PacketPath[] = [
  {
    name: "SYN", detail: "seq 1000", direction: "client-to-server", flags: ["SYN"], sequence: "1000", acknowledgement: "—",
    startsAt: 1, x1: 350, y1: 176, x2: 750, y2: 226, head: "750,226 734,218 738,233", labelX: 495, labelY: 201, labelWidth: 110,
  },
  {
    name: "SYN + ACK", detail: "seq 5000 · ack 1001", direction: "server-to-client", flags: ["SYN", "ACK"], sequence: "5000", acknowledgement: "1001",
    startsAt: 3, x1: 750, y1: 278, x2: 350, y2: 318, head: "350,318 366,310 362,325", labelX: 484, labelY: 298, labelWidth: 132,
  },
  {
    name: "ACK", detail: "ack 5001", direction: "client-to-server", flags: ["ACK"], sequence: "1001", acknowledgement: "5001",
    startsAt: 5, x1: 350, y1: 338, x2: 750, y2: 338, head: "750,338 734,330 734,346", labelX: 497, labelY: 338, labelWidth: 106,
  },
  {
    name: "FIN", detail: "seq 1001", direction: "client-to-server", flags: ["FIN"], sequence: "1001", acknowledgement: "5001",
    startsAt: 8, x1: 350, y1: 426, x2: 750, y2: 476, head: "750,476 734,468 738,483", labelX: 496, labelY: 451, labelWidth: 108,
  },
  {
    name: "ACK", detail: "ack 1002", direction: "server-to-client", flags: ["ACK"], sequence: "5001", acknowledgement: "1002",
    startsAt: 10, x1: 750, y1: 506, x2: 350, y2: 462, head: "350,462 366,454 362,469", labelX: 495, labelY: 484, labelWidth: 110,
  },
  {
    name: "FIN", detail: "seq 5001", direction: "server-to-client", flags: ["FIN"], sequence: "5001", acknowledgement: "1002",
    startsAt: 12, x1: 750, y1: 532, x2: 350, y2: 526, head: "350,526 366,518 366,534", labelX: 496, labelY: 529, labelWidth: 108,
  },
  {
    name: "ACK", detail: "ack 5002", direction: "client-to-server", flags: ["ACK"], sequence: "1002", acknowledgement: "5002",
    startsAt: 13, x1: 350, y1: 560, x2: 750, y2: 590, head: "750,590 734,582 738,597", labelX: 495, labelY: 575, labelWidth: 110,
  },
];

function flowColor(direction: PacketDirection) {
  return direction === "client-to-server"
    ? "var(--network-client-flow)"
    : "var(--network-server-flow)";
}

function stateName(bandId: string) {
  return bandId.replace(/^(client|server)-/, "").replace(/-/g, " ");
}

function bandTone(
  phase: StateBand<string>["phase"],
  endpoint: Endpoint,
  isCurrent: boolean,
  isPast: boolean,
) {
  if (!isCurrent && !isPast) return "var(--border)";
  if (phase === "closed") return "var(--foreground-muted)";
  if (phase === "transfer") return "var(--success)";
  if (phase === "termination") return "var(--warning)";

  return endpoint === "client"
    ? "var(--network-client-flow)"
    : "var(--network-server-flow)";
}

function bandOpacity(isCurrent: boolean, isPast: boolean) {
  if (isCurrent) return 1;
  if (isPast) return 0.76;
  return 0.32;
}

export default function TCPHandshakeSimulation({
  externalStep,
}: TraceableSimulationProps = {}) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<SimulationSpeed>(1);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!playing || externalStep !== undefined) return undefined;

    const intervalId = window.setInterval(() => {
      setStep((currentStep) => {
        if (currentStep >= LIFECYCLE_STEPS.length - 1) {
          setPlaying(false);
          return currentStep;
        }

        return currentStep + 1;
      });
    }, 800 / speed);

    return () => window.clearInterval(intervalId);
  }, [externalStep, playing, speed]);

  const currentStep = Math.max(0, Math.min(LIFECYCLE_STEPS.length - 1, externalStep ?? step));
  const state = LIFECYCLE_STEPS[currentStep];
  const visualTransition = shouldReduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 220, damping: 24 };
  const isDataTransfer = currentStep >= 6 && currentStep <= 7;
  const isTerminating = currentStep >= 8;

  return (
    <div className="p-0">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="text-lg font-semibold text-foreground">TCP connection lifecycle</h3>
          <span className="border border-accent-networking/35 bg-accent-networking/10 px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-accent-networking">
            setup · transfer · close
          </span>
        </div>
        {externalStep === undefined ? (
          <span className="border border-border bg-background px-2.5 py-1 font-mono text-[0.62rem] text-muted">
            step {currentStep}/{LIFECYCLE_STEPS.length - 1}
          </span>
        ) : null}
      </header>

      <section className="overflow-hidden border border-border bg-surface/20" aria-label="TCP connection lifecycle simulation">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
          <div className="font-mono text-[0.62rem] uppercase tracking-[0.13em] text-muted">
            <span className="text-foreground">{String(currentStep).padStart(2, "0")}</span> · {state.label}
          </div>
          <div className="flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.1em] text-muted">
            <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5" style={{ backgroundColor: "var(--network-client-flow)" }} />client → server</span>
            <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5" style={{ backgroundColor: "var(--network-server-flow)" }} />server → client</span>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar">
          <svg
            className="block min-w-[54rem] w-full"
            viewBox="0 0 1100 700"
            role="img"
            aria-label={`TCP lifecycle step ${currentStep}: ${state.label}. Client TCP is ${stateName(state.clientBand)}; server TCP is ${stateName(state.serverBand)}.`}
          >
            <rect x="0" y="0" width="1100" height="700" fill="var(--background)" opacity="0.34" />

            <rect x="180" y="26" width="220" height="66" rx="14" fill="var(--surface)" stroke="var(--border)" />
            <text x="202" y="53" fill="var(--foreground)" fontFamily="var(--font-mono)" fontSize="12" fontWeight="600" letterSpacing="1.4">CLIENT APPLICATION</text>
            <text x="202" y="74" fill="var(--network-client-flow)" fontFamily="var(--font-mono)" fontSize="11">active open · active close</text>

            <rect x="700" y="26" width="220" height="66" rx="14" fill="var(--surface)" stroke="var(--border)" />
            <text x="722" y="53" fill="var(--foreground)" fontFamily="var(--font-mono)" fontSize="12" fontWeight="600" letterSpacing="1.4">SERVER APPLICATION</text>
            <text x="722" y="74" fill="var(--network-server-flow)" fontFamily="var(--font-mono)" fontSize="11">passive open · passive close</text>

            <text x="550" y="52" textAnchor="middle" fill="var(--foreground-muted)" fontFamily="var(--font-mono)" fontSize="10" letterSpacing="1.6">TCP STATE TIMELINE</text>
            <text x="550" y="72" textAnchor="middle" fill="var(--foreground)" fontFamily="var(--font-mono)" fontSize="12" fontWeight="600">one connection · complete lifecycle</text>

            <rect x="110" y="328" width="880" height="96" fill="color-mix(in oklab, var(--success) 7%, var(--background))" stroke="var(--success)" strokeWidth="1.25" strokeDasharray="6 7" opacity={isDataTransfer ? 1 : 0.36} />
            <text x="550" y="360" textAnchor="middle" fill="var(--success)" fontFamily="var(--font-mono)" fontSize="12" fontWeight="700" letterSpacing="1.45" opacity={isDataTransfer ? 1 : 0.44}>ESTABLISHED · DATA CAN FLOW</text>
            <text x="550" y="383" textAnchor="middle" fill="var(--foreground-muted)" fontFamily="var(--font-mono)" fontSize="10" opacity={isDataTransfer ? 0.92 : 0.34}>reliable, ordered application bytes in both directions</text>

            <rect x="110" y="414" width="880" height="270" fill="color-mix(in oklab, var(--warning) 6%, var(--background))" stroke="var(--warning)" strokeWidth="1.25" strokeDasharray="6 7" opacity={isTerminating ? 1 : 0.36} />
            <text x="550" y="664" textAnchor="middle" fill="var(--warning)" fontFamily="var(--font-mono)" fontSize="11" fontWeight="700" letterSpacing="1.4" opacity={isTerminating ? 1 : 0.44}>ORDERLY TERMINATION</text>
            <text x="550" y="683" textAnchor="middle" fill="var(--foreground-muted)" fontFamily="var(--font-mono)" fontSize="10" opacity={isTerminating ? 0.9 : 0.34}>FIN closes each direction independently; ACK confirms each close.</text>

            <rect x="230" y="144" width="120" height="494" fill="var(--surface)" stroke="var(--border)" />
            <rect x="750" y="144" width="120" height="494" fill="var(--surface)" stroke="var(--border)" />
            <text x="290" y="124" textAnchor="middle" fill="var(--foreground-muted)" fontFamily="var(--font-mono)" fontSize="10" letterSpacing="1.4">CLIENT TCP</text>
            <text x="810" y="124" textAnchor="middle" fill="var(--foreground-muted)" fontFamily="var(--font-mono)" fontSize="10" letterSpacing="1.4">SERVER TCP</text>

            {CLIENT_BANDS.map((band, index) => {
              const currentIndex = CLIENT_BANDS.findIndex((candidate) => candidate.id === state.clientBand);
              const isCurrent = index === currentIndex;
              const isPast = index < currentIndex;
              const tone = bandTone(band.phase, "client", isCurrent, isPast);
              const opacity = bandOpacity(isCurrent, isPast);
              const center = (band.from + band.to) / 2;

              return (
                <g key={band.id}>
                  <motion.rect
                    x="231"
                    y={band.from}
                    width="118"
                    height={band.to - band.from}
                    fill={`color-mix(in oklab, ${tone} ${isCurrent ? "18%" : isPast ? "9%" : "3%"}, var(--surface))`}
                    stroke={tone}
                    strokeWidth={isCurrent ? 2.5 : 1}
                    initial={false}
                    animate={{ opacity }}
                    transition={visualTransition}
                  />
                  {band.labels.map((label, labelIndex) => (
                    <motion.text
                      key={label}
                      x="290"
                      y={center + (labelIndex - (band.labels.length - 1) / 2) * 13 + 4}
                      textAnchor="middle"
                      fill={tone}
                      fontFamily="var(--font-mono)"
                      fontSize={band.labels.length > 1 ? "10" : "11"}
                      fontWeight={isCurrent ? "700" : "500"}
                      letterSpacing="0.65"
                      initial={false}
                      animate={{ opacity, scale: isCurrent ? 1.04 : 1 }}
                      transition={visualTransition}
                    >
                      {label}
                    </motion.text>
                  ))}
                </g>
              );
            })}

            {SERVER_BANDS.map((band, index) => {
              const currentIndex = SERVER_BANDS.findIndex((candidate) => candidate.id === state.serverBand);
              const isCurrent = index === currentIndex;
              const isPast = index < currentIndex;
              const tone = bandTone(band.phase, "server", isCurrent, isPast);
              const opacity = bandOpacity(isCurrent, isPast);
              const center = (band.from + band.to) / 2;

              return (
                <g key={band.id}>
                  <motion.rect
                    x="751"
                    y={band.from}
                    width="118"
                    height={band.to - band.from}
                    fill={`color-mix(in oklab, ${tone} ${isCurrent ? "18%" : isPast ? "9%" : "3%"}, var(--surface))`}
                    stroke={tone}
                    strokeWidth={isCurrent ? 2.5 : 1}
                    initial={false}
                    animate={{ opacity }}
                    transition={visualTransition}
                  />
                  {band.labels.map((label, labelIndex) => (
                    <motion.text
                      key={label}
                      x="810"
                      y={center + (labelIndex - (band.labels.length - 1) / 2) * 13 + 4}
                      textAnchor="middle"
                      fill={tone}
                      fontFamily="var(--font-mono)"
                      fontSize={band.labels.length > 1 ? "10" : "11"}
                      fontWeight={isCurrent ? "700" : "500"}
                      letterSpacing="0.65"
                      initial={false}
                      animate={{ opacity, scale: isCurrent ? 1.04 : 1 }}
                      transition={visualTransition}
                    >
                      {label}
                    </motion.text>
                  ))}
                </g>
              );
            })}

            {PACKET_PATHS.filter((packetPath) => currentStep >= packetPath.startsAt).map((packetPath) => {
              const isCurrent = currentStep === packetPath.startsAt;
              const color = flowColor(packetPath.direction);
              const opacity = isCurrent ? 1 : 0.68;
              const labelHeight = 30;

              return (
                <motion.g
                  key={`${packetPath.name}-${packetPath.startsAt}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity }}
                  transition={visualTransition}
                >
                  <motion.line
                    x1={packetPath.x1}
                    y1={packetPath.y1}
                    x2={packetPath.x2}
                    y2={packetPath.y2}
                    stroke={color}
                    strokeWidth={isCurrent ? 3 : 2}
                    initial={isCurrent ? { pathLength: 0 } : false}
                    animate={{ pathLength: 1 }}
                    transition={visualTransition}
                  />
                  <polygon points={packetPath.head} fill={color} />
                  <rect
                    x={packetPath.labelX}
                    y={packetPath.labelY - labelHeight / 2}
                    width={packetPath.labelWidth}
                    height={labelHeight}
                    fill="var(--background)"
                    stroke={color}
                    strokeWidth={isCurrent ? 2 : 1.2}
                  />
                  <text
                    x={packetPath.labelX + packetPath.labelWidth / 2}
                    y={packetPath.labelY - 2}
                    textAnchor="middle"
                    fill={color}
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                    fontWeight="700"
                    letterSpacing="0.85"
                  >
                    {packetPath.name}
                  </text>
                  <text
                    x={packetPath.labelX + packetPath.labelWidth / 2}
                    y={packetPath.labelY + 10}
                    textAnchor="middle"
                    fill="var(--foreground-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="8.5"
                  >
                    {packetPath.detail}
                  </text>
                  {isCurrent ? (
                    <motion.circle
                      cx={(packetPath.x1 + packetPath.x2) / 2}
                      cy={(packetPath.y1 + packetPath.y2) / 2}
                      r="6"
                      fill={color}
                      initial={false}
                      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: [0.3, 1, 0.3], r: [5, 8, 5] }}
                      transition={shouldReduceMotion ? { duration: 0 } : { duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                    />
                  ) : null}
                </motion.g>
              );
            })}
          </svg>
        </div>

        <div className="border-t border-border px-4 py-3.5 sm:px-5">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-[repeat(16,minmax(0,1fr))]" aria-label="TCP lifecycle step progression">
            {LIFECYCLE_STEPS.map((entry, index) => {
              const active = index === currentStep;
              const className =
                "flex min-h-12 flex-col items-start justify-center border px-2 text-left font-mono transition " +
                (active
                  ? "border-accent-networking bg-accent-networking/14 text-accent-networking"
                  : index < currentStep
                    ? "border-success/35 bg-success/5 text-success"
                    : "border-border bg-background/60 text-muted opacity-55");
              const contents = (
                <>
                  <span className="text-[0.5rem] uppercase tracking-[0.11em]">{String(index).padStart(2, "0")}</span>
                  <strong className="mt-1 text-[0.6rem] font-medium leading-tight">{entry.label}</strong>
                </>
              );

              return externalStep === undefined ? (
                <button
                  key={entry.label}
                  type="button"
                  onClick={() => {
                    setStep(index);
                    setPlaying(false);
                  }}
                  aria-current={active ? "step" : undefined}
                  aria-label={`Show TCP lifecycle step ${index}: ${entry.label}`}
                  className={className + " hover:border-accent-networking/65 hover:text-foreground"}
                >
                  {contents}
                </button>
              ) : (
                <span key={entry.label} aria-current={active ? "step" : undefined} className={className}>
                  {contents}
                </span>
              );
            })}
          </div>
        </div>
      </section>

      {externalStep === undefined ? (
        <SimulationControls
          isPlaying={playing}
          speed={speed}
          canStepBack={step > 0}
          canStepForward={step < LIFECYCLE_STEPS.length - 1}
          onPlayPause={() => setPlaying((currentPlaying) => !currentPlaying)}
          onStepBack={() => setStep((currentStep) => Math.max(0, currentStep - 1))}
          onStepForward={() => setStep((currentStep) => Math.min(LIFECYCLE_STEPS.length - 1, currentStep + 1))}
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
