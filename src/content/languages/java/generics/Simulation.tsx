import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  SimulationControls,
  type SimulationSpeed,
} from "../../../../components/ui/SimulationControls";

type TypeSlot = {
  param: string;
  bound: string;
  filledWith: string;
};

type GenericClass = {
  name: string;
  typeParams: TypeSlot[];
  value: string;
};

type Step = {
  label: string;
  description: string;
  classInfo: GenericClass;
  highlight: string;
  showErasure: boolean;
};

const STEPS: Step[] = [
  {
    label: "Define generic class with type parameter T",
    description: "Box<T> declares T as a placeholder type. T can be used for fields, method params, and return types.",
    classInfo: {
      name: "Box",
      typeParams: [{ param: "T", bound: "Object", filledWith: "" }],
      value: "raw",
    },
    highlight: "T",
    showErasure: false,
  },
  {
    label: "Box<String> stringBox = new Box<>()",
    description: "Type argument String is bound to T. Compiler checks all subsequent operations against String.",
    classInfo: {
      name: "Box",
      typeParams: [{ param: "T", bound: "Object", filledWith: "String" }],
      value: "null",
    },
    highlight: "String",
    showErasure: false,
  },
  {
    label: "stringBox.set(\"Hello\") — compile-time type safety",
    description: "Only a String (or subtype) may be passed to set(). Passing an Integer would be a compile error.",
    classInfo: {
      name: "Box",
      typeParams: [{ param: "T", bound: "Object", filledWith: "String" }],
      value: "\"Hello\"",
    },
    highlight: "set",
    showErasure: false,
  },
  {
    label: "String val = stringBox.get() — no cast needed",
    description: "The compiler knows get() returns T → String. No explicit cast required at the call site.",
    classInfo: {
      name: "Box",
      typeParams: [{ param: "T", bound: "Object", filledWith: "String" }],
      value: "\"Hello\"",
    },
    highlight: "get",
    showErasure: false,
  },
  {
    label: "Box<Integer> intBox = new Box<>()",
    description: "The same generic class Box works with Integer. The compiler re-checks type safety for Integer.",
    classInfo: {
      name: "Box",
      typeParams: [{ param: "T", bound: "Object", filledWith: "Integer" }],
      value: "null",
    },
    highlight: "Integer",
    showErasure: false,
  },
  {
    label: "Generic method: static <U> U identity(U arg)",
    description: "U is inferred at the call site. identity(\"hi\") returns String; identity(42) returns Integer.",
    classInfo: {
      name: "Box",
      typeParams: [{ param: "T", bound: "Object", filledWith: "Integer" }],
      value: "42",
    },
    highlight: "method",
    showErasure: false,
  },
  {
    label: "Bounded type: <T extends Comparable<T>> T max(T a, T b)",
    description: "T is constrained to Comparable. The compiler allows compareTo() calls inside max().",
    classInfo: {
      name: "Box",
      typeParams: [{ param: "T", bound: "Comparable<T>", filledWith: "String" }],
      value: "\"Hello\"",
    },
    highlight: "bound",
    showErasure: false,
  },
  {
    label: "Type erasure: runtime sees only Box (T → Object)",
    description: "Box<String> and Box<Integer> are both just Box at runtime. T is erased to Object — generics are compile-time only.",
    classInfo: {
      name: "Box",
      typeParams: [{ param: "T", bound: "Object", filledWith: "(erased)" }],
      value: "\"Hello\"",
    },
    highlight: "erasure",
    showErasure: true,
  },
];

function SourceCode({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-background p-3 font-mono text-xs leading-relaxed text-foreground">
      <code>{code}</code>
    </pre>
  );
}

export default function GenericsSimulation() {
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

  const sourceLines = [
    `class Box${current.classInfo.typeParams.map((tp) =>
      `<${tp.param}${tp.bound !== "Object" ? ` extends ${tp.bound}` : ""}>`
    ).join("")} {`,
    `    private ${current.classInfo.typeParams[0]?.param ?? "T"} value;`,
    ``,
    `    void set(${current.classInfo.typeParams[0]?.param ?? "T"} value) {`,
    `        this.value = value;`,
    `    }`,
    ``,
    `    ${current.classInfo.typeParams[0]?.param ?? "T"} get() {`,
    `        return value;`,
    `    }`,
    `}`,
  ];

  if (current.highlight === "method") {
    sourceLines.push(
      ``,
      `static <U> U identity(U arg) { return arg; }`,
      `// identity("hi") → String, identity(42) → Integer`,
    );
  }
  if (current.highlight === "bound") {
    sourceLines.push(
      ``,
      `static <T extends Comparable<T>> T max(T a, T b) {`,
      `    return a.compareTo(b) > 0 ? a : b;`,
      `}`,
    );
  }
  if (current.showErasure) {
    sourceLines.push(
      ``,
      `// After erasure (runtime view):`,
      `// class Box {`,
      `//     private Object value;`,
      `//     void set(Object value) { ... }`,
      `//     Object get() { ... }`,
      `// }`,
    );
  }

  return (
    <div className="p-0">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{current.label}</h3>
        <span className="rounded-full bg-background px-3 py-1 font-mono text-xs text-muted">
          step {step + 1}/{STEPS.length}
        </span>
      </div>
      <p className="mb-4 text-xs text-muted">{current.description}</p>
      <div className="mb-4">
        <SourceCode code={sourceLines.join("\n")} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-xl border-2 bg-surface p-4"
          style={{ borderColor: "var(--accent-languages)" }}
        >
          <div className="mb-3 flex items-center gap-2">
            <span
              className="rounded px-2 font-mono text-xs font-bold"
              style={{ background: "var(--accent-languages)", color: "var(--background)" }}
            >
              {current.classInfo.name}
            </span>
            {current.classInfo.typeParams.map((tp) => (
              <span
                key={tp.param}
                className="rounded px-1.5 font-mono text-[11px]"
                style={{
                  background: current.highlight === "erasure" ? "var(--warning)" : "var(--foreground-muted)",
                  color: "var(--background)",
                }}
              >
                {current.showErasure ? `${tp.param} → Object` : tp.filledWith || tp.param}
              </span>
            ))}
          </div>
          {current.classInfo.typeParams.map((tp) => (
            <div key={tp.param} className="mb-2">
              <span className="font-mono text-[11px] text-muted">type parameter </span>
              <span
                className="rounded px-1 font-mono text-xs"
                style={{
                  background: "var(--accent-languages)",
                  color: "var(--background)",
                }}
              >
                {tp.param}
              </span>
              {tp.bound !== "Object" && (
                <span className="ml-1 font-mono text-[11px] text-muted">
                  extends {tp.bound}
                </span>
              )}
              {tp.filledWith && !current.showErasure && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.4 }}
                  className="mt-1.5 rounded border bg-background px-2 py-1"
                  style={{
                    borderColor: "var(--accent-languages)",
                    transformOrigin: "left",
                  }}
                >
                  <span className="font-mono text-[11px] text-muted">→ bound to </span>
                  <span
                    className="rounded px-1 font-mono text-xs"
                    style={{ background: "var(--success)", color: "var(--background)" }}
                  >
                    {tp.filledWith}
                  </span>
                </motion.div>
              )}
              {current.showErasure && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.4 }}
                  className="mt-1.5 rounded border-2 px-2 py-1"
                  style={{
                    borderColor: "var(--warning)",
                    background: "color-mix(in oklab, var(--warning) 15%, transparent)",
                    transformOrigin: "left",
                  }}
                >
                  <span className="font-mono text-[11px]" style={{ color: "var(--warning)" }}>
                    erased to Object at runtime
                  </span>
                </motion.div>
              )}
            </div>
          ))}
          <div className="mt-3 rounded-lg bg-background p-2">
            <span className="font-mono text-[11px] text-muted">value = </span>
            <span className="font-mono text-xs text-foreground">{current.classInfo.value}</span>
          </div>
        </motion.div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase" style={{ color: "var(--accent-languages)" }}>
            Compile-time vs Runtime
          </h4>
          <div className="space-y-2">
            <div
              className="rounded-lg border p-2"
              style={{
                borderColor: current.showErasure ? "var(--border)" : "var(--success)",
              }}
            >
              <span className="font-mono text-[11px]" style={{ color: "var(--success)" }}>
                ✓
              </span>
              <span className="ml-1 font-mono text-[11px] text-muted">Compile: </span>
              <span className="font-mono text-xs text-foreground">
                {current.classInfo.typeParams.map((tp) =>
                  tp.filledWith && !current.showErasure
                    ? `Box<${tp.filledWith}>`
                    : `Box<${tp.param}>`
                ).join(", ") || "Box<T>"}
              </span>
            </div>
            <div
              className="rounded-lg border p-2"
              style={{
                borderColor: current.showErasure ? "var(--warning)" : "var(--border)",
              }}
            >
              <span className="font-mono text-[11px]" style={{ color: "var(--warning)" }}>
                {current.showErasure ? "!" : "○"}
              </span>
              <span className="ml-1 font-mono text-[11px] text-muted">Runtime: </span>
              <span className="font-mono text-xs text-foreground">Box (raw)</span>
            </div>
          </div>
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
        onReset={() => {
          setStep(0);
          setPlaying(false);
        }}
        onSpeedChange={setSpeed}
      />
    </div>
  );
}
