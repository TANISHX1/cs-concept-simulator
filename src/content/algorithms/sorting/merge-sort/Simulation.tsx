import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  SimulationControls,
  type SimulationSpeed,
} from "../../../../components/ui/SimulationControls";

const source = [8, 3, 6, 2, 7, 4, 1, 5];

export default function MergeSortSimulation() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<SimulationSpeed>(1);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(
      () =>
        setStep((s) => {
          if (s >= source.length) {
            setPlaying(false);
            return s;
          }
          return s + 1;
        }),
      650 / speed,
    );
    return () => clearInterval(id);
  }, [playing, speed]);

  const values = useMemo(
    () =>
      source
        .map((v, i) => ({ v, i }))
        .sort((a, b) => (a.i < step && b.i < step ? a.v - b.v : 0)),
    [step],
  );
  return (
    <div className="p-0">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Divide, sort, merge</h3>
        </div>
        <span className="rounded-full bg-background px-3 py-1 font-mono text-xs text-muted">
          pass {Math.min(step, source.length)}/8
        </span>
      </div>
      <div className="flex h-48 items-end justify-center gap-2 p-6">
        {values.map(({ v, i }) => (
          <motion.div
            key={i}
            layout
            className="flex w-8 flex-col items-center gap-2"
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
          >
            <motion.div
              animate={{ height: `${v * 14}px`, opacity: i < step ? 1 : 0.55 }}
              className="w-full rounded-t-md bg-accent-algorithms"
            />
            <span className="font-mono text-xs text-muted">{v}</span>
          </motion.div>
        ))}
      </div>
      <SimulationControls
        isPlaying={playing}
        speed={speed}
        canStepBack={step > 0}
        canStepForward={step < source.length}
        onPlayPause={() => setPlaying((current) => !current)}
        onStepBack={() => setStep((current) => Math.max(0, current - 1))}
        onStepForward={() =>
          setStep((current) => Math.min(source.length, current + 1))
        }
        onReset={() => {
          setStep(0);
          setPlaying(false);
        }}
        onSpeedChange={setSpeed}
      />
    </div>
  );
}
