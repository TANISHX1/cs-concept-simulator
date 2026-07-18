import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  SimulationControls,
  type SimulationSpeed,
} from "../../../../components/ui/SimulationControls";

type TemplateDecl = {
  id: string;
  name: string;
  params: string;
  body: string;
};

type Instantiation = {
  id: string;
  templateId: string;
  args: string;
  generatedCode: string;
  active: boolean;
};

type Step = {
  label: string;
  currentTemplate?: TemplateDecl;
  currentInstantiation?: Instantiation;
  allInstantiations: { templateId: string; inst: Instantiation }[];
  showSpecialization?: boolean;
};

const TEMPLATE_FN: TemplateDecl = {
  id: "t_max",
  name: "max",
  params: "typename T",
  body: "T max(T a, T b) { return (a > b) ? a : b; }",
};

const TEMPLATE_CLASS: TemplateDecl = {
  id: "t_array",
  name: "Array",
  params: "typename T, int N",
  body: "struct Array { T data[N]; };",
};

const TEMPLATE_SPEC: TemplateDecl = {
  id: "t_array_spec",
  name: "Array<bool, 0>",
  params: "",
  body: "template<> struct Array<bool, 0> { /* empty — zero-size optimization */ };",
};

const STEPS: Step[] = [
  {
    label: "Function template: template<typename T> T max(T a, T b)",
    currentTemplate: TEMPLATE_FN,
    allInstantiations: [],
  },
  {
    label: "max<int>(3, 7) — compiler generates int version",
    currentTemplate: TEMPLATE_FN,
    currentInstantiation: {
      id: "inst_int",
      templateId: "t_max",
      args: "<int>",
      generatedCode: "int max(int a, int b) { return (a > b) ? a : b; }",
      active: true,
    },
    allInstantiations: [
      { templateId: "t_max", inst: { id: "inst_int", templateId: "t_max", args: "<int>", generatedCode: "int max(int a, int b) { return (a > b) ? a : b; }", active: true } },
    ],
  },
  {
    label: "max<double>(3.14, 2.72) — double version",
    currentTemplate: TEMPLATE_FN,
    currentInstantiation: {
      id: "inst_double",
      templateId: "t_max",
      args: "<double>",
      generatedCode: "double max(double a, double b) { return (a > b) ? a : b; }",
      active: true,
    },
    allInstantiations: [
      { templateId: "t_max", inst: { id: "inst_int", templateId: "t_max", args: "<int>", generatedCode: "int max(int a, int b) { return (a > b) ? a : b; }", active: true } },
      { templateId: "t_max", inst: { id: "inst_double", templateId: "t_max", args: "<double>", generatedCode: "double max(double a, double b) { return (a > b) ? a : b; }", active: true } },
    ],
  },
  {
    label: "max<char>('a', 'z') — char version",
    currentTemplate: TEMPLATE_FN,
    currentInstantiation: {
      id: "inst_char",
      templateId: "t_max",
      args: "<char>",
      generatedCode: "char max(char a, char b) { return (a > b) ? a : b; }",
      active: true,
    },
    allInstantiations: [
      { templateId: "t_max", inst: { id: "inst_int", templateId: "t_max", args: "<int>", generatedCode: "int max(int a, int b) { return (a > b) ? a : b; }", active: true } },
      { templateId: "t_max", inst: { id: "inst_double", templateId: "t_max", args: "<double>", generatedCode: "double max(double a, double b) { return (a > b) ? a : b; }", active: true } },
      { templateId: "t_max", inst: { id: "inst_char", templateId: "t_max", args: "<char>", generatedCode: "char max(char a, char b) { return (a > b) ? a : b; }", active: true } },
    ],
  },
  {
    label: "Class template: template<typename T, int N> struct Array",
    currentTemplate: TEMPLATE_CLASS,
    allInstantiations: [],
  },
  {
    label: "Array<int, 5> arr — instantiated with int and 5",
    currentTemplate: TEMPLATE_CLASS,
    currentInstantiation: {
      id: "inst_arr_int_5",
      templateId: "t_array",
      args: "<int, 5>",
      generatedCode: "struct Array_int_5 { int data[5]; };",
      active: true,
    },
    allInstantiations: [
      { templateId: "t_array", inst: { id: "inst_arr_int_5", templateId: "t_array", args: "<int, 5>", generatedCode: "struct Array_int_5 { int data[5]; };", active: true } },
    ],
  },
  {
    label: "Template specialization: Array<bool, 0> — separate implementation",
    currentTemplate: TEMPLATE_SPEC,
    showSpecialization: true,
    allInstantiations: [
      { templateId: "t_array", inst: { id: "inst_arr_int_5", templateId: "t_array", args: "<int, 5>", generatedCode: "struct Array_int_5 { int data[5]; };", active: true } },
      { templateId: "t_array", inst: { id: "inst_arr_bool_0", templateId: "t_array", args: "<bool, 0>", generatedCode: "template<> struct Array<bool, 0> { /* empty */ };", active: true } },
    ],
  },
];

export default function TemplatesSimulation() {
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

  return (
    <div className="p-0">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{current.label}</h3>
        <span className="rounded-full bg-background px-3 py-1 font-mono text-xs text-muted">
          step {step + 1}/{STEPS.length}
        </span>
      </div>
      {current.currentTemplate && (
        <div className="mb-4 rounded-xl border border-border bg-surface p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase text-accent-languages">
            Template Definition
          </h4>
          <div className="rounded-lg bg-background p-3 font-mono text-xs text-foreground">
            {current.currentTemplate.params && (
              <div style={{ color: "var(--accent-languages)" }}>
                template&lt;{current.currentTemplate.params}&gt;
              </div>
            )}
            <div>{current.currentTemplate.body}</div>
          </div>
        </div>
      )}
      {current.showSpecialization && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-xl border-2 p-3"
          style={{ borderColor: "var(--accent-languages)", background: "color-mix(in oklab, var(--accent-languages) 8%, transparent)" }}
        >
          <h4 className="mb-2 text-xs font-semibold uppercase" style={{ color: "var(--accent-languages)" }}>
            Template Specialization
          </h4>
          <div className="rounded-lg bg-background p-3 font-mono text-xs text-foreground">
            <div style={{ color: "var(--accent-languages)" }}>template&lt;&gt;</div>
            <div>struct Array&lt;bool, 0&gt; &#123; /* empty — zero-size optimization */ &#125;;</div>
          </div>
        </motion.div>
      )}
      {current.allInstantiations.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-3">
          <h4 className="mb-3 text-xs font-semibold uppercase text-muted">
            Instantiated Code
          </h4>
          <div className="flex flex-col gap-2">
            {current.allInstantiations.map((item) => (
              <motion.div
                key={item.inst.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: item.inst.active ? 1 : 0.6, x: 0 }}
                transition={{ duration: 0.3 }}
                className="rounded-lg border bg-background p-2.5"
                style={{
                  borderColor: item.inst.active ? "var(--accent-languages)" : "var(--border)",
                }}
              >
                <div className="mb-1 font-mono text-[10px] text-muted">
                  instantiation {item.inst.args}
                </div>
                <div className="font-mono text-xs text-foreground">
                  {item.inst.generatedCode}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
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