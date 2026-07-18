import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  SimulationControls,
  type SimulationSpeed,
} from "../../../../components/ui/SimulationControls";

type CollectionNode = {
  id: string;
  label: string;
  active: boolean;
  children?: CollectionNode[];
};

type Operation = {
  label: string;
  complexity: string;
  color: string;
};

type Step = {
  label: string;
  description: string;
  tree: CollectionNode[];
  operation: Operation;
  highlightedOps: string[];
};

const STEPS: Step[] = [
  {
    label: "ArrayList — dynamic array backing",
    description: "Elements stored contiguously. get(index) is O(1). Insert at index shifts all subsequent elements O(n).",
    tree: [
      { id: "a0", label: "\"apple\"", active: true },
      { id: "a1", label: "\"banana\"", active: true },
      { id: "a2", label: "\"cherry\"", active: true },
      { id: "a3", label: "\"date\"", active: false, children: [
        { id: "a3a", label: "(empty slot)", active: false },
      ]},
    ],
    operation: { label: "add(\"date\")", complexity: "O(1)*", color: "var(--success)" },
    highlightedOps: ["append", "index-access"],
  },
  {
    label: "LinkedList — doubly-linked list nodes",
    description: "Each node has prev/next pointers. Insert at middle is O(1) after node found. get(index) traverses from head O(n).",
    tree: [
      { id: "la", label: "\"apple\"", active: true, children: [
        { id: "la-next", label: "→", active: true, children: [
          { id: "lb", label: "\"banana\"", active: true, children: [
            { id: "lb-next", label: "→", active: true, children: [
              { id: "lc", label: "\"cherry\"", active: true },
            ]},
          ]},
        ]},
      ]},
    ],
    operation: { label: "add(1, \"grape\")", complexity: "O(1)*", color: "var(--success)" },
    highlightedOps: ["pointer-rewire", "traverse"],
  },
  {
    label: "HashSet — hash table buckets",
    description: "add(element) computes hashCode → bucket index. Collisions handled by chaining. contains is O(1) average.",
    tree: [
      { id: "h0", label: "bucket[0]", active: false },
      { id: "h1", label: "bucket[1]", active: true, children: [
        { id: "h1a", label: "\"banana\"", active: true },
        { id: "h1b", label: "\"berry\"", active: false },
      ]},
      { id: "h2", label: "bucket[2]", active: false },
      { id: "h3", label: "bucket[3]", active: true, children: [
        { id: "h3a", label: "\"apple\"", active: true },
      ]},
      { id: "h4", label: "bucket[4]", active: false },
      { id: "h5", label: "bucket[5]", active: true, children: [
        { id: "h5a", label: "\"cherry\"", active: true },
      ]},
    ],
    operation: { label: "add(\"berry\") hash → bucket[1]", complexity: "O(1)", color: "var(--success)" },
    highlightedOps: ["hash", "bucket", "collision"],
  },
  {
    label: "TreeSet — Red-Black tree (balanced BST)",
    description: "add compares elements, traverses left/right, inserts at leaf. Self-balancing keeps height O(log n).",
    tree: [
      { id: "t-root", label: "\"cherry\"", active: true, children: [
        { id: "t-left", label: "\"apple\"", active: true, children: [
          { id: "t-left-left", label: "\"apricot\"", active: false },
        ]},
        { id: "t-right", label: "\"fig\"", active: true, children: [
          { id: "t-right-left", label: "\"date\"", active: true },
          { id: "t-right-right", label: "\"grape\"", active: false },
        ]},
      ]},
    ],
    operation: { label: "add(\"date\") → compare → left of fig → insert", complexity: "O(log n)", color: "var(--accent-languages)" },
    highlightedOps: ["compare", "traverse", "insert"],
  },
  {
    label: "HashMap — key-value pairs in buckets",
    description: "put(key, value) hashes key → bucket, stores entry. get(key) hashes key → lookup O(1) average.",
    tree: [
      { id: "m0", label: "bucket[0]", active: false },
      { id: "m1", label: "bucket[1]", active: true, children: [
        { id: "m1a", label: "\"banana\" → 2", active: true },
      ]},
      { id: "m2", label: "bucket[2]", active: false },
      { id: "m3", label: "bucket[3]", active: true, children: [
        { id: "m3a", label: "\"apple\" → 5", active: true },
        { id: "m3b", label: "\"avocado\" → 3", active: false },
      ]},
      { id: "m4", label: "bucket[4]", active: false },
    ],
    operation: { label: "put(\"avocado\", 3) → hash → bucket[3]", complexity: "O(1)", color: "var(--success)" },
    highlightedOps: ["hash-key", "bucket", "collision-chain"],
  },
  {
    label: "Iterator pattern — cursor traversal",
    description: "Iterator tracks cursor position. hasNext() checks if more elements remain. next() returns current and advances.",
    tree: [
      { id: "i0", label: "\"apple\"", active: true },
      { id: "i1", label: "\"banana\"", active: true },
      { id: "i2", label: "\"cherry\"", active: true },
      { id: "i3", label: "\"date\"", active: true },
    ],
    operation: { label: "cursor → \"banana\" (next called 2×)", complexity: "O(1) per next()", color: "var(--accent-languages)" },
    highlightedOps: ["cursor", "hasNext", "next"],
  },
];

const STRUCTURE_NAMES: Record<string, string> = {
  "ArrayList — dynamic array backing": "ArrayList",
  "LinkedList — doubly-linked list nodes": "LinkedList",
  "HashSet — hash table buckets": "HashSet",
  "TreeSet — Red-Black tree (balanced BST)": "TreeSet",
  "HashMap — key-value pairs in buckets": "HashMap",
  "Iterator pattern — cursor traversal": "Iterator",
};

function renderNode(node: CollectionNode, depth: number): JSX.Element {
  const hasChildren = node.children && node.children.length > 0;
  return (
    <div key={node.id} className="relative">
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{
          opacity: node.active ? 1 : 0.3,
          scale: 1,
        }}
        transition={{ duration: 0.3 }}
        className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs"
        style={{
          borderColor: node.active ? "var(--accent-languages)" : "var(--border)",
          background: node.active
            ? "color-mix(in oklab, var(--accent-languages) 10%, transparent)"
            : "var(--surface)",
        }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{
            background: node.active ? "var(--success)" : "var(--foreground-muted)",
          }}
        />
        <span className="font-mono text-foreground">{node.label}</span>
      </motion.div>
      {hasChildren && (
        <div className="ml-4 mt-1.5 flex flex-col gap-1.5 border-l-2 pl-3"
          style={{ borderColor: "var(--border)" }}
        >
          {node.children!.map((child) => renderNode(child, depth + 1))}
        </div>
      )}
    </div>
  );
}

export default function CollectionsSimulation() {
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

  const structName = STRUCTURE_NAMES[current.label] || "Collection";

  return (
    <div className="p-0">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{current.label}</h3>
        <span className="rounded-full bg-background px-3 py-1 font-mono text-xs text-muted">
          step {step + 1}/{STEPS.length}
        </span>
      </div>
      <p className="mb-4 text-xs text-muted">{current.description}</p>
      <div className="mb-4 flex items-center gap-3">
        <span
          className="rounded px-2 font-mono text-xs font-bold"
          style={{ background: "var(--accent-languages)", color: "var(--background)" }}
        >
          {structName}
        </span>
        <motion.div
          key={current.operation.label}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <span className="font-mono text-xs text-foreground">{current.operation.label}</span>
          <span
            className="rounded px-1 font-mono text-[10px] font-bold"
            style={{ background: current.operation.color, color: "var(--background)" }}
          >
            {current.operation.complexity}
          </span>
        </motion.div>
      </div>
      <div className="rounded-xl border border-border bg-surface p-4">
        {current.highlightedOps.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {current.highlightedOps.map((op) => (
              <span
                key={op}
                className="rounded px-1.5 font-mono text-[10px]"
                style={{
                  background: "var(--accent-languages)",
                  color: "var(--background)",
                }}
              >
                {op}
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-2">
          {current.tree.map((node) => renderNode(node, 0))}
        </div>
      </div>
      <div className="mt-3 rounded-lg border bg-background p-3 text-center font-mono text-xs text-muted"
        style={{ borderColor: "var(--border)" }}
      >
        {current.operation.complexity.includes("O(1)") && !current.operation.complexity.includes("log") ? (
          <span style={{ color: "var(--success)" }}>Constant-time operation — no scaling cost</span>
        ) : current.operation.complexity.includes("log") ? (
          <span style={{ color: "var(--accent-languages)" }}>Logarithmic — grows slowly as data increases</span>
        ) : (
          <span style={{ color: "var(--warning)" }}>Linear — cost grows proportionally with data size</span>
        )}
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
