import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  SimulationControls,
  type SimulationSpeed,
} from "../../../../components/ui/SimulationControls";

type VtableEntry = {
  funcName: string;
  address: string;
  active: boolean;
};

type ClassInfo = {
  id: string;
  name: string;
  vtable: VtableEntry[];
  objectLayout: string[];
};

type PointerInfo = {
  name: string;
  className: string;
  targetClassId: string;
};

type DispatchCall = {
  from: string;
  to: string;
  result: string;
};

type Step = {
  label: string;
  classes: ClassInfo[];
  pointers: PointerInfo[];
  activeCall?: DispatchCall;
};

const STEPS: Step[] = [
  {
    label: "Base class Shape with virtual draw() — object contains vptr",
    classes: [
      {
        id: "shape",
        name: "Shape",
        vtable: [
          { funcName: "draw()", address: "0x5000", active: true },
        ],
        objectLayout: ["[vptr → Shape vtable]"],
      },
    ],
    pointers: [],
  },
  {
    label: "Circle : public Shape overrides draw() — Circle gets its own vtable",
    classes: [
      {
        id: "shape",
        name: "Shape",
        vtable: [
          { funcName: "draw()", address: "0x5000", active: false },
        ],
        objectLayout: ["[vptr → Shape vtable]"],
      },
      {
        id: "circle",
        name: "Circle",
        vtable: [
          { funcName: "draw()", address: "0x5100", active: true },
        ],
        objectLayout: ["[vptr → Circle vtable]", "radius"],
      },
    ],
    pointers: [],
  },
  {
    label: "Square : public Shape overrides draw()",
    classes: [
      {
        id: "shape",
        name: "Shape",
        vtable: [
          { funcName: "draw()", address: "0x5000", active: false },
        ],
        objectLayout: ["[vptr → Shape vtable]"],
      },
      {
        id: "circle",
        name: "Circle",
        vtable: [
          { funcName: "draw()", address: "0x5100", active: false },
        ],
        objectLayout: ["[vptr → Circle vtable]", "radius"],
      },
      {
        id: "square",
        name: "Square",
        vtable: [
          { funcName: "draw()", address: "0x5200", active: true },
        ],
        objectLayout: ["[vptr → Square vtable]", "side"],
      },
    ],
    pointers: [],
  },
  {
    label: "Shape* shapes[3] = {new Circle(), new Square(), new Triangle()}",
    classes: [
      {
        id: "shape",
        name: "Shape",
        vtable: [
          { funcName: "draw()", address: "0x5000", active: false },
        ],
        objectLayout: ["[vptr → Shape vtable]"],
      },
      {
        id: "circle",
        name: "Circle",
        vtable: [
          { funcName: "draw()", address: "0x5100", active: true },
        ],
        objectLayout: ["[vptr → Circle vtable]", "radius"],
      },
      {
        id: "square",
        name: "Square",
        vtable: [
          { funcName: "draw()", address: "0x5200", active: true },
        ],
        objectLayout: ["[vptr → Square vtable]", "side"],
      },
      {
        id: "triangle",
        name: "Triangle",
        vtable: [
          { funcName: "draw()", address: "0x5300", active: true },
        ],
        objectLayout: ["[vptr → Triangle vtable]", "base", "height"],
      },
    ],
    pointers: [
      { name: "shapes[0]", className: "Shape*", targetClassId: "circle" },
      { name: "shapes[1]", className: "Shape*", targetClassId: "square" },
      { name: "shapes[2]", className: "Shape*", targetClassId: "triangle" },
    ],
  },
  {
    label: "shapes[0]->draw() → vptr → Circle vtable → Circle::draw()",
    classes: [
      {
        id: "shape",
        name: "Shape",
        vtable: [
          { funcName: "draw()", address: "0x5000", active: false },
        ],
        objectLayout: ["[vptr]"],
      },
      {
        id: "circle",
        name: "Circle",
        vtable: [
          { funcName: "draw()", address: "0x5100", active: true },
        ],
        objectLayout: ["[vptr → Circle vtable]", "radius"],
      },
      {
        id: "square",
        name: "Square",
        vtable: [
          { funcName: "draw()", address: "0x5200", active: false },
        ],
        objectLayout: ["[vptr]", "side"],
      },
      {
        id: "triangle",
        name: "Triangle",
        vtable: [
          { funcName: "draw()", address: "0x5300", active: false },
        ],
        objectLayout: ["[vptr]", "base", "height"],
      },
    ],
    pointers: [
      { name: "shapes[0]", className: "Shape*", targetClassId: "circle" },
      { name: "shapes[1]", className: "Shape*", targetClassId: "square" },
      { name: "shapes[2]", className: "Shape*", targetClassId: "triangle" },
    ],
    activeCall: { from: "shapes[0]", to: "Circle::draw()", result: "Drawing a Circle" },
  },
  {
    label: "shapes[1]->draw() → Square vtable → Square::draw()",
    classes: [
      {
        id: "shape",
        name: "Shape",
        vtable: [
          { funcName: "draw()", address: "0x5000", active: false },
        ],
        objectLayout: ["[vptr]"],
      },
      {
        id: "circle",
        name: "Circle",
        vtable: [
          { funcName: "draw()", address: "0x5100", active: false },
        ],
        objectLayout: ["[vptr]", "radius"],
      },
      {
        id: "square",
        name: "Square",
        vtable: [
          { funcName: "draw()", address: "0x5200", active: true },
        ],
        objectLayout: ["[vptr → Square vtable]", "side"],
      },
      {
        id: "triangle",
        name: "Triangle",
        vtable: [
          { funcName: "draw()", address: "0x5300", active: false },
        ],
        objectLayout: ["[vptr]", "base", "height"],
      },
    ],
    pointers: [
      { name: "shapes[0]", className: "Shape*", targetClassId: "circle" },
      { name: "shapes[1]", className: "Shape*", targetClassId: "square" },
      { name: "shapes[2]", className: "Shape*", targetClassId: "triangle" },
    ],
    activeCall: { from: "shapes[1]", to: "Square::draw()", result: "Drawing a Square" },
  },
  {
    label: "shapes[2]->draw() → Triangle vtable → Triangle::draw()",
    classes: [
      {
        id: "shape",
        name: "Shape",
        vtable: [
          { funcName: "draw()", address: "0x5000", active: false },
        ],
        objectLayout: ["[vptr]"],
      },
      {
        id: "circle",
        name: "Circle",
        vtable: [
          { funcName: "draw()", address: "0x5100", active: false },
        ],
        objectLayout: ["[vptr]", "radius"],
      },
      {
        id: "square",
        name: "Square",
        vtable: [
          { funcName: "draw()", address: "0x5200", active: false },
        ],
        objectLayout: ["[vptr]", "side"],
      },
      {
        id: "triangle",
        name: "Triangle",
        vtable: [
          { funcName: "draw()", address: "0x5300", active: true },
        ],
        objectLayout: ["[vptr → Triangle vtable]", "base", "height"],
      },
    ],
    pointers: [
      { name: "shapes[0]", className: "Shape*", targetClassId: "circle" },
      { name: "shapes[1]", className: "Shape*", targetClassId: "square" },
      { name: "shapes[2]", className: "Shape*", targetClassId: "triangle" },
    ],
    activeCall: { from: "shapes[2]", to: "Triangle::draw()", result: "Drawing a Triangle" },
  },
];

export default function PolymorphismSimulation() {
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
    }, 1100 / speed);
    return () => clearInterval(id);
  }, [playing, speed, maxStep]);

  const isActiveClass = (classId: string) => {
    return current.pointers.some((p) => p.targetClassId === classId);
  };

  return (
    <div className="p-0">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{current.label}</h3>
        <span className="rounded-full bg-background px-3 py-1 font-mono text-xs text-muted">
          step {step + 1}/{STEPS.length}
        </span>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3">
        {current.classes.map((cls) => {
          const active = isActiveClass(cls.id);
          const hasActiveCall = current.activeCall?.to.startsWith(cls.name);
          return (
            <motion.div
              key={cls.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{
                opacity: 1,
                y: 0,
                borderColor: active || hasActiveCall ? "var(--accent-languages)" : "var(--border)",
              }}
              transition={{ duration: 0.3 }}
              className="rounded-xl border-2 bg-surface p-3"
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="rounded px-2 font-mono text-xs font-bold"
                  style={{
                    background: active || hasActiveCall ? "var(--accent-languages)" : "var(--foreground-muted)",
                    color: "var(--background)",
                  }}
                >
                  {cls.name}
                </span>
                {hasActiveCall && (
                  <span
                    className="rounded px-1.5 font-mono text-[10px]"
                    style={{ background: "var(--success)", color: "var(--background)" }}
                  >
                    dispatching
                  </span>
                )}
              </div>
              <div className="mb-2 rounded-lg bg-background p-2">
                <div className="mb-1 font-mono text-[10px] text-muted">vtable</div>
                {cls.vtable.map((entry) => (
                  <div
                    key={entry.funcName}
                    className="flex items-center gap-2 rounded px-1.5 py-0.5"
                    style={{
                      background: entry.active ? "color-mix(in oklab, var(--accent-languages) 12%, transparent)" : "transparent",
                    }}
                  >
                    <span className="font-mono text-[10px] text-foreground">{entry.funcName}</span>
                    <span className="ml-auto font-mono text-[9px] text-muted">{entry.address}</span>
                  </div>
                ))}
              </div>
              <div>
                <div className="mb-1 font-mono text-[10px] text-muted">object layout</div>
                <div className="flex flex-wrap gap-1">
                  {cls.objectLayout.map((field, i) => (
                    <span
                      key={i}
                      className="rounded px-1.5 font-mono text-[10px]"
                      style={{
                        background: field.includes("vptr")
                          ? "color-mix(in oklab, var(--accent-languages) 15%, transparent)"
                          : "var(--surface)",
                        color: field.includes("vptr") ? "var(--accent-languages)" : "var(--foreground)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {field}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      {current.pointers.length > 0 && (
        <div className="mb-4 rounded-xl border border-border bg-surface p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase text-muted">Polymorphic Pointers</h4>
          <div className="flex flex-wrap gap-2">
            {current.pointers.map((ptr) => {
              const target = current.classes.find((c) => c.id === ptr.targetClassId);
              const isActive = current.activeCall?.from === ptr.name;
              return (
                <motion.div
                  key={ptr.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 rounded-lg border bg-background px-2.5 py-1.5"
                  style={{
                    borderColor: isActive ? "var(--accent-languages)" : "var(--border)",
                  }}
                >
                  <span className="font-mono text-xs text-foreground">{ptr.name}</span>
                  <span className="font-mono text-[10px] text-muted">({ptr.className})</span>
                  <span className="text-muted">→</span>
                  {target && (
                    <span
                      className="rounded px-1.5 font-mono text-[10px]"
                      style={{
                        background: "color-mix(in oklab, var(--accent-languages) 15%, transparent)",
                        color: "var(--accent-languages)",
                      }}
                    >
                      {target.name}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
      {current.activeCall && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border-2 p-3 text-center"
          style={{ borderColor: "var(--success)", background: "color-mix(in oklab, var(--success) 8%, transparent)" }}
        >
          <div className="font-mono text-xs">
            <span className="text-foreground">{current.activeCall.from}</span>
            <span className="text-muted"> → vptr → vtable → </span>
            <span style={{ color: "var(--accent-languages)" }}>{current.activeCall.to}</span>
          </div>
          <div className="mt-1 font-mono text-sm" style={{ color: "var(--success)" }}>
            {current.activeCall.result}
          </div>
        </motion.div>
      )}
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