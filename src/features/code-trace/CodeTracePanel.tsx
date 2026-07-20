import type { CodeTrace } from "../../lib/types";

function formatValue(value: unknown) {
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function highlightCStyleLine(line: string) {
  const tokens = line.split(
    /(\/\/.*|\b(?:void|int|char|float|double|bool|typedef|struct|if|else|while|for|return|break|continue|true|false|NULL)\b|\b\d+\b|\b[A-Za-z_]\w*(?=\s*\())/g,
  );

  return tokens.map((token, index) => {
    if (/^\/\//.test(token)) {
      return <span key={index} className="code-comment">{token}</span>;
    }

    if (/^(void|int|char|float|double|bool|typedef|struct|if|else|while|for|return|break|continue|true|false|NULL)$/.test(token)) {
      return <span key={index} className="code-keyword">{token}</span>;
    }

    if (/^\d+$/.test(token)) {
      return <span key={index} className="code-number">{token}</span>;
    }

    if (/^[A-Za-z_]\w*$/.test(token)) {
      return <span key={index} className="code-function">{token}</span>;
    }

    return token;
  });
}

export function CodeTracePanel({
  trace,
  traceStepIndices,
  currentStep,
  maxStep,
}: {
  trace: CodeTrace;
  traceStepIndices: number[];
  currentStep: number;
  maxStep: number;
}) {
  const activeTraceStep = trace.steps[traceStepIndices.at(-1) ?? 0] ?? trace.steps[0];
  const activeLines = new Set(
    traceStepIndices
      .map((index) => trace.steps[index]?.line)
      .filter((line): line is number => Number.isInteger(line)),
  );
  const sourceLines = trace.sourceCode.split("\n");

  if (!activeTraceStep) return null;

  return (
    <section className="trace-panel" aria-label="Code execution trace">
      <header className="trace-panel-header">
        <div>
          <p className="trace-eyebrow">Execution trace</p>
          <h2>C-style code</h2>
        </div>
        <div className="trace-panel-meta">
          <span className="trace-step-indicator">
            step {currentStep}/{maxStep}
          </span>
          <span className="trace-language">{trace.language}</span>
        </div>
      </header>

      <div className="trace-code scrollbar" aria-live="polite">
        {sourceLines.map((line, index) => {
          const lineNumber = index + 1;
          const isActive = activeLines.has(lineNumber);

          return (
            <div
              key={`${lineNumber}-${line}`}
              className={`trace-code-line ${isActive ? "is-active" : ""}`}
              aria-current={isActive ? "step" : undefined}
            >
              <span className="trace-line-number" aria-hidden="true">
                {lineNumber}
              </span>
              <code>{highlightCStyleLine(line) || " "}</code>
            </div>
          );
        })}
      </div>

      <div className="trace-inspector">
        <section className="trace-inspector-section">
          <h3>Variables</h3>
          <dl className="trace-variables">
            {Object.entries(activeTraceStep.variables).map(([name, value]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{formatValue(value)}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="trace-inspector-section">
          <h3>Call stack</h3>
          <ol className="trace-call-stack">
            {activeTraceStep.callStack.map((frame, index) => (
              <li key={`${index}-${frame}`}>
                <span>{activeTraceStep.callStack.length - index}</span>
                <code>{frame}</code>
              </li>
            ))}
          </ol>
        </section>

        <section className="trace-inspector-section trace-stdout">
          <h3>stdout</h3>
          <pre>{activeTraceStep.stdout || "No output for this step."}</pre>
        </section>
      </div>
    </section>
  );
}
