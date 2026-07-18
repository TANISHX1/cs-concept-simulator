import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  SimulationControls,
  type SimulationSpeed,
} from "../../../../components/ui/SimulationControls";

type Method = {
  name: string;
  signature: string;
  satisfied: boolean;
};

type Step = {
  label: string;
  interfaceMethods: Method[];
  concreteType: { name: string; methods: Method[] } | null;
  satisfied: boolean | null;
  interfaceValue: { typeName: string; value: string } | null;
  phase: "define" | "satisfy" | "value" | "dispatch" | "empty";
};

const STEPS: Step[] = [
  {
    label: "1. Define interface: type Stringer interface { String() string }",
    interfaceMethods: [{ name: "String", signature: "String() string", satisfied: false }],
    concreteType: null,
    satisfied: null,
    interfaceValue: null,
    phase: "define",
  },
  {
    label: "2. Define Book struct with String() method",
    interfaceMethods: [{ name: "String", signature: "String() string", satisfied: false }],
    concreteType: {
      name: "Book",
      methods: [{ name: "String", signature: "String() string", satisfied: true }],
    },
    satisfied: null,
    interfaceValue: null,
    phase: "satisfy",
  },
  {
    label: "3. Book satisfies Stringer interface implicitly!",
    interfaceMethods: [{ name: "String", signature: "String() string", satisfied: true }],
    concreteType: {
      name: "Book",
      methods: [{ name: "String", signature: "String() string", satisfied: true }],
    },
    satisfied: true,
    interfaceValue: null,
    phase: "satisfy",
  },
  {
    label: "4. Person also satisfies Stringer",
    interfaceMethods: [{ name: "String", signature: "String() string", satisfied: true }],
    concreteType: {
      name: "Person",
      methods: [{ name: "String", signature: "String() string", satisfied: true }],
    },
    satisfied: true,
    interfaceValue: null,
    phase: "satisfy",
  },
  {
    label: "5. Interface value: var s Stringer = Book{\"Golang\"}",
    interfaceMethods: [{ name: "String", signature: "String() string", satisfied: true }],
    concreteType: {
      name: "Book",
      methods: [{ name: "String", signature: "String() string", satisfied: true }],
    },
    satisfied: true,
    interfaceValue: { typeName: "Book", value: `{Title: "Golang"}` },
    phase: "value",
  },
  {
    label: "6. s.String() → dynamic dispatch to Book.String()",
    interfaceMethods: [{ name: "String", signature: "String() string", satisfied: true }],
    concreteType: {
      name: "Book",
      methods: [{ name: "String", signature: "String() string", satisfied: true }],
    },
    satisfied: true,
    interfaceValue: { typeName: "Book", value: `{Title: "Golang"} → "Book: Golang"` },
    phase: "dispatch",
  },
  {
    label: "7. s = Person{\"Alice\"} → interface value now holds Person",
    interfaceMethods: [{ name: "String", signature: "String() string", satisfied: true }],
    concreteType: {
      name: "Person",
      methods: [{ name: "String", signature: "String() string", satisfied: true }],
    },
    satisfied: true,
    interfaceValue: { typeName: "Person", value: `{Name: "Alice"}` },
    phase: "value",
  },
  {
    label: "8. Empty interface: interface{} can hold any type",
    interfaceMethods: [],
    concreteType: null,
    satisfied: null,
    interfaceValue: { typeName: "any", value: "42, \"hello\", Book{...}, etc." },
    phase: "empty",
  },
];

export default function InterfacesSimulation() {
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
    }, 1200 / speed);
    return () => clearInterval(id);
  }, [playing, speed, maxStep]);

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
          <h4 className="mb-2 text-xs font-semibold uppercase text-accent-languages">
            Interface contract
          </h4>
          <div className="rounded-lg border-2 border-accent-languages bg-background px-3 py-2">
            <div className="mb-1 font-mono text-xs font-bold text-accent-languages">Stringer</div>
            {current.interfaceMethods.length > 0 ? (
              current.interfaceMethods.map((m) => (
                <div key={m.name} className="flex items-center gap-2 py-0.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      m.satisfied ? "bg-green-500" : "bg-muted"
                    }`}
                    style={{
                      background: m.satisfied ? "var(--success)" : "var(--foreground-muted)",
                    }}
                  />
                  <span className="font-mono text-xs text-foreground">{m.signature}</span>
                </div>
              ))
            ) : (
              <div className="font-mono text-xs text-muted">(no methods — any type)</div>
            )}
          </div>
          {current.satisfied && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
              className="mt-2 text-center font-mono text-xs"
              style={{ color: "var(--success)" }}
            >
              ✓ interface satisfied
            </motion.div>
          )}
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase" style={{ color: "var(--success)" }}>
            Concrete type
          </h4>
          {current.concreteType ? (
            <div className="rounded-lg border-2 bg-background px-3 py-2"
              style={{
                borderColor: current.satisfied ? "var(--success)" : "var(--border)",
              }}
            >
              <div
                className="mb-1 font-mono text-xs font-bold"
                style={{ color: current.satisfied ? "var(--success)" : "var(--foreground-muted)" }}
              >
                {current.concreteType.name}
              </div>
              {current.concreteType.methods.map((m) => (
                <div key={m.name} className="flex items-center gap-2 py-0.5">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: m.satisfied ? "var(--success)" : "var(--foreground-muted)",
                    }}
                  />
                  <span className="font-mono text-xs text-foreground">
                    func ({current.concreteType!.name}) {m.signature}
                  </span>
                  {m.satisfied && (
                    <span
                      className="ml-auto rounded px-1 font-mono text-[10px]"
                      style={{ background: "var(--success)", color: "var(--background)" }}
                    >
                      matches
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center font-mono text-xs text-muted">(no type selected)</div>
          )}
        </div>
      </div>
      {current.interfaceValue && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mt-3 rounded-xl border-2 bg-surface p-3"
          style={{
            borderColor: current.phase === "empty" ? "var(--warning)" : "var(--accent-languages)",
          }}
        >
          <h4 className="mb-2 text-xs font-semibold uppercase" style={{ color: "var(--accent-languages)" }}>
            Interface value
          </h4>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-background px-2 py-1 font-mono text-xs" style={{ color: "var(--accent-languages)" }}>
              type: {current.interfaceValue.typeName}
            </div>
            <div className="rounded-lg bg-background px-2 py-1 font-mono text-xs text-foreground">
              value: {current.interfaceValue.value}
            </div>
          </div>
          <div className="mt-1 font-mono text-[10px] text-muted">
            [type_ptr, data_ptr] — dynamic dispatch pair
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
