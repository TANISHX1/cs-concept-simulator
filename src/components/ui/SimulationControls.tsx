import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";

export type SimulationSpeed = 0.5 | 1 | 1.5 | 2;

type SimulationControlsProps = {
  isPlaying: boolean;
  speed: SimulationSpeed;
  canStepBack: boolean;
  canStepForward: boolean;
  onPlayPause: () => void;
  onStepBack: () => void;
  onStepForward: () => void;
  onReset: () => void;
  onSpeedChange: (speed: SimulationSpeed) => void;
};

const buttonClass =
  "rounded-lg border border-border p-2 text-muted transition hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40";

export function SimulationControls({
  isPlaying,
  speed,
  canStepBack,
  canStepForward,
  onPlayPause,
  onStepBack,
  onStepForward,
  onReset,
  onSpeedChange,
}: SimulationControlsProps) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      <button
        type="button"
        aria-label="Step back"
        title="Step back"
        onClick={onStepBack}
        disabled={!canStepBack}
        className={buttonClass}
      >
        <SkipBack size={16} />
      </button>
      <button
        type="button"
        aria-label={isPlaying ? "Pause simulation" : "Play simulation"}
        title={isPlaying ? "Pause" : "Play"}
        onClick={onPlayPause}
        disabled={!canStepForward && !isPlaying}
        className="rounded-lg bg-foreground p-2 text-background transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <button
        type="button"
        aria-label="Step forward"
        title="Step forward"
        onClick={onStepForward}
        disabled={!canStepForward}
        className={buttonClass}
      >
        <SkipForward size={16} />
      </button>
      <button
        type="button"
        aria-label="Reset simulation"
        title="Reset"
        onClick={onReset}
        className={"ml-auto " + buttonClass}
      >
        <RotateCcw size={16} />
      </button>
      <label className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted">
        <span className="font-mono">Speed</span>
        <select
          aria-label="Simulation speed"
          value={speed}
          onChange={(event) =>
            onSpeedChange(Number(event.target.value) as SimulationSpeed)
          }
          className="bg-transparent font-mono text-foreground outline-none"
        >
          <option value={0.5}>0.5×</option>
          <option value={1}>1×</option>
          <option value={1.5}>1.5×</option>
          <option value={2}>2×</option>
        </select>
      </label>
    </div>
  );
}
