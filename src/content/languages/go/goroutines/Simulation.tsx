import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  SimulationControls,
  type SimulationSpeed,
} from "../../../../components/ui/SimulationControls";

type Goroutine = {
  id: string;
  name: string;
  status: "running" | "blocked-send" | "blocked-recv" | "done";
};

type ChannelOp = {
  from: string;
  to: string;
  value: number;
};

type Step = {
  label: string;
  goroutines: Goroutine[];
  channel: { value: number | null; buffered: boolean; buffer: (number | null)[] };
  ops: ChannelOp[];
  phase: string;
};

const STEPS: Step[] = [
  {
    label: "1. Launch goroutine: go worker()",
    goroutines: [
      { id: "main", name: "main", status: "running" },
      { id: "w1", name: "worker", status: "running" },
    ],
    channel: { value: null, buffered: false, buffer: [] },
    ops: [],
    phase: "launch",
  },
  {
    label: "2. Main sends value 42 to channel: ch <- 42",
    goroutines: [
      { id: "main", name: "main", status: "blocked-send" },
      { id: "w1", name: "worker", status: "blocked-recv" },
    ],
    channel: { value: null, buffered: false, buffer: [] },
    ops: [{ from: "main", to: "worker", value: 42 }],
    phase: "send",
  },
  {
    label: "3. Worker receives 42 from channel: val := <-ch",
    goroutines: [
      { id: "main", name: "main", status: "done" },
      { id: "w1", name: "worker", status: "running" },
    ],
    channel: { value: null, buffered: false, buffer: [] },
    ops: [{ from: "main", to: "worker", value: 42 }],
    phase: "recv",
  },
  {
    label: "4. Launch 3 workers concurrently",
    goroutines: [
      { id: "main", name: "main", status: "running" },
      { id: "w1", name: "worker-1", status: "running" },
      { id: "w2", name: "worker-2", status: "running" },
      { id: "w3", name: "worker-3", status: "running" },
    ],
    channel: { value: null, buffered: false, buffer: [] },
    ops: [],
    phase: "multi",
  },
  {
    label: "5. Buffered channel: ch := make(chan int, 2) — buffer fills",
    goroutines: [
      { id: "main", name: "main", status: "running" },
    ],
    channel: { value: null, buffered: true, buffer: [10, 20, null] },
    ops: [],
    phase: "buffer",
  },
  {
    label: "6. select: race between channel receive and timeout",
    goroutines: [
      { id: "main", name: "main", status: "running" },
      { id: "w1", name: "worker", status: "running" },
    ],
    channel: { value: null, buffered: false, buffer: [] },
    ops: [],
    phase: "select",
  },
];

export default function GoroutinesSimulation() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<SimulationSpeed>(1);

  const current = STEPS[step];
  const maxStep = STEPS.length - 1;

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setStep((s) => {
        if (s >= maxStep) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 1300 / speed);
    return () => clearInterval(id);
  }, [playing, speed, maxStep]);

  const statusColor = (status: string) => {
    switch (status) {
      case "running": return "var(--success)";
      case "blocked-send":
      case "blocked-recv": return "var(--warning)";
      case "done": return "var(--foreground-muted)";
      default: return "var(--foreground-muted)";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "running": return "running";
      case "blocked-send": return "blocked (send)";
      case "blocked-recv": return "blocked (recv)";
      case "done": return "done";
      default: return status;
    }
  };

  return (
    <div className="p-0">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{current.label}</h3>
        <span className="rounded-full bg-background px-3 py-1 font-mono text-xs text-muted">
          step {step + 1}/{STEPS.length}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase text-accent-languages">Goroutines</h4>
          <div className="flex flex-col gap-2">
            {current.goroutines.map((g) => (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-3 rounded-lg border-2 bg-background px-3 py-2"
                style={{ borderColor: statusColor(g.status) }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: statusColor(g.status) }}
                />
                <span className="font-mono text-xs text-foreground">{g.name}</span>
                <span
                  className="ml-auto rounded px-1.5 font-mono text-[10px]"
                  style={{ background: statusColor(g.status), color: "var(--background)" }}
                >
                  {statusLabel(g.status)}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase" style={{ color: "var(--accent-languages)" }}>
            Channel
          </h4>
          <div
            className="rounded-lg border-2 bg-background px-3 py-3"
            style={{
              borderColor: current.channel.buffered ? "var(--warning)" : "var(--accent-languages)",
            }}
          >
            <div className="mb-2 font-mono text-xs text-muted">
              {current.channel.buffered ? "buffered (cap=2)" : "unbuffered"}
            </div>
            <div className="flex gap-1">
              {current.channel.buffer.map((v, i) => (
                <div
                  key={i}
                  className="flex h-8 w-8 items-center justify-center rounded border font-mono text-xs"
                  style={{
                    borderColor: v !== null ? "var(--success)" : "var(--border)",
                    background: v !== null
                      ? "color-mix(in oklab, var(--success) 10%, transparent)"
                      : "var(--foreground-muted)",
                  }}
                >
                  {v !== null ? v : "—"}
                </div>
              ))}
              {current.channel.buffer.length === 0 && (
                <div className="font-mono text-xs text-muted">
                  {current.channel.value !== null ? current.channel.value : "(empty)"}
                </div>
              )}
            </div>
          </div>
          {current.ops.length > 0 && (
            <div className="mt-2 flex flex-col gap-1">
              {current.ops.map((op, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-2 rounded px-2 py-1 font-mono text-xs"
                  style={{
                    background: "color-mix(in oklab, var(--accent-languages) 10%, transparent)",
                  }}
                >
                  <span className="text-foreground">{op.from}</span>
                  <span className="text-muted">→ {op.value} →</span>
                  <span className="text-foreground">{op.to}</span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="mt-3">
        <h4 className="mb-2 text-xs font-semibold uppercase text-muted">Go code</h4>
        <div className="rounded-lg bg-background px-3 py-2 font-mono text-xs text-foreground">
          {current.phase === "buffer" && (
            <>ch := make(chan <span style={{ color: "var(--accent-languages)" }}>int</span>, 2){"\n"}ch &lt;- 10{"\n"}ch &lt;- 20</>
          )}
          {current.phase === "select" && (
            <>select {'{'}{"\n"}  case v := &lt;-ch:{"\n"}    fmt.Println(v){"\n"}  case &lt;-time.After(1 * time.Second):{"\n"}    fmt.Println("timeout"){"\n"}{'}'}</>
          )}
          {current.phase !== "buffer" && current.phase !== "select" && (
            <>go worker(){"\n"}ch &lt;- 42{"\n"}val := &lt;-ch</>
          )}
        </div>
      </div>
      <SimulationControls
        isPlaying={playing}
        speed={speed}
        canStepBack={step > 0}
        canStepForward={step < maxStep}
        onPlayPause={() => setPlaying((p) => !p)}
        onStepBack={() => setStep((s) => Math.max(0, s - 1))}
        onStepForward={() => setStep((s) => Math.min(maxStep, s + 1))}
        onReset={() => { setStep(0); setPlaying(false); }}
        onSpeedChange={setSpeed}
      />
    </div>
  );
}
