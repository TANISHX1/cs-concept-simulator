import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { AlertCircle, Bot, Send, X } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useActiveSimulation } from "../../components/simulation/ActiveSimulationContext";
import { aiHeaders } from "../../lib/apiClient";
import type { SimulationSpec } from "../../lib/simulationSpec";
import type { Meta } from "../../lib/types";

type ChatConcept = Pick<Meta, "title">;

function getToolErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to apply that simulation change.";
}

export function ChatPanel({
  concept,
  open,
  onClose,
  onModifySimulation,
}: {
  concept?: ChatConcept;
  open: boolean;
  onClose: () => void;
  onModifySimulation?: (modificationRequest: string) => Promise<SimulationSpec>;
}) {
  const [input, setInput] = useState("");
  const [modificationError, setModificationError] = useState<string | null>(null);
  const transport = useMemo(
    () => new DefaultChatTransport({ headers: aiHeaders }),
    [],
  );
  const {
    messages,
    sendMessage,
    status,
    error,
    clearError,
    addToolOutput,
  } = useChat({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });
  const activeSimulation = useActiveSimulation();
  const handledToolCallIds = useRef(new Set<string>());
  const scrollRef = useRef<HTMLDivElement>(null);
  const isResponsePending = status === "submitted" || status === "streaming";
  const canSend = status === "ready" && input.trim().length > 0;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [error, isResponsePending, messages]);

  useEffect(() => {
    for (const message of messages) {
      for (const part of message.parts) {
        if (
          part.type !== "tool-setSimulationStep" &&
          part.type !== "tool-modifySimulation"
        ) {
          continue;
        }

        if (handledToolCallIds.current.has(part.toolCallId)) continue;

        if (part.type === "tool-setSimulationStep") {
          const toolInput = part.input;

          if (
            !activeSimulation ||
            part.state !== "input-available" ||
            !toolInput ||
            typeof toolInput !== "object" ||
            !("index" in toolInput) ||
            typeof toolInput.index !== "number" ||
            !Number.isInteger(toolInput.index)
          ) {
            continue;
          }

          handledToolCallIds.current.add(part.toolCallId);
          activeSimulation.setIsPlaying(false);
          activeSimulation.setStep(toolInput.index);
          void addToolOutput({
            tool: "setSimulationStep",
            toolCallId: part.toolCallId,
            output: { index: toolInput.index },
            options: {
              body: {
                conceptTitle: concept?.title,
                simulationContext: activeSimulation.groundingContext ?? undefined,
                canModifySimulation: Boolean(onModifySimulation),
              },
            },
          });
          continue;
        }

        if (part.type !== "tool-modifySimulation") continue;

        const toolInput = part.input;

        if (
          !onModifySimulation ||
          part.state !== "input-available" ||
          !toolInput ||
          typeof toolInput !== "object" ||
          !("modificationRequest" in toolInput) ||
          typeof toolInput.modificationRequest !== "string" ||
          !toolInput.modificationRequest.trim()
        ) {
          continue;
        }

        handledToolCallIds.current.add(part.toolCallId);
        setModificationError(null);

        void onModifySimulation(toolInput.modificationRequest)
          .then((newSpec) =>
            addToolOutput({
              tool: "modifySimulation",
              toolCallId: part.toolCallId,
              output: {
                title: newSpec.title,
                visualType: newSpec.visualType,
                steps: newSpec.steps.length,
              },
              options: {
                body: {
                  conceptTitle: newSpec.title,
                  simulationContext: undefined,
                  canModifySimulation: true,
                },
              },
            }),
          )
          .catch((caughtError) => {
            const errorText = getToolErrorMessage(caughtError);
            setModificationError(errorText);
            return addToolOutput({
              state: "output-error",
              tool: "modifySimulation",
              toolCallId: part.toolCallId,
              errorText,
              options: {
                body: {
                  conceptTitle: concept?.title,
                  simulationContext: activeSimulation?.groundingContext ?? undefined,
                  canModifySimulation: true,
                },
              },
            });
          });
      }
    }
  }, [
    activeSimulation,
    addToolOutput,
    concept?.title,
    messages,
    onModifySimulation,
  ]);

  const send = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim();

    if (!text || status !== "ready") return;

    setModificationError(null);
    void sendMessage(
      { text },
      {
        body: {
          conceptTitle: concept?.title,
          simulationContext: activeSimulation?.groundingContext ?? undefined,
          canModifySimulation: Boolean(onModifySimulation),
        },
      },
    );
    setInput("");
  };

  if (!open) return null;

  return (
    <aside className="fixed bottom-4 right-4 z-40 flex h-[min(65vh,32rem)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-panel">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent-algorithms/15 text-accent-algorithms">
          <Bot size={15} />
        </span>
        <div>
          <p className="text-sm font-medium">Trace Kernel Copilot</p>
          <p className="text-[11px] text-muted">Context-aware learning help</p>
        </div>
        <button
          type="button"
          aria-label="Close Trace Kernel Copilot"
          onClick={onClose}
          className="ml-auto rounded-md p-1 text-muted transition hover:bg-surface-hover hover:text-foreground"
        >
          <X size={15} />
        </button>
      </div>
      <div ref={scrollRef} className="scrollbar flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-4 text-sm leading-relaxed text-muted">
            Ask about{" "}
            <span className="text-foreground">
              {concept?.title ?? "any concept"}
            </span>
            , the current step, or a trade-off you want to understand.
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`rounded-xl p-3 text-sm leading-relaxed ${
              message.role === "user"
                ? "ml-6 bg-foreground text-background"
                : "mr-3 bg-background text-muted copilot-prose"
            }`}
          >
            {message.parts.map((part, index) =>
              part.type === "text" ? (
                message.role === "assistant" ? (
                  <ReactMarkdown
                    key={index}
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="mb-2 ml-4 list-disc last:mb-0">{children}</ul>,
                      ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal last:mb-0">{children}</ol>,
                      li: ({ children }) => <li className="mb-0.5">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                      code: ({ children }) => (
                        <code className="rounded bg-surface px-1 py-0.5 font-mono text-xs text-foreground">
                          {children}
                        </code>
                      ),
                      h1: ({ children }) => <h3 className="mb-1 mt-2 font-semibold text-foreground">{children}</h3>,
                      h2: ({ children }) => <h3 className="mb-1 mt-2 font-semibold text-foreground">{children}</h3>,
                      h3: ({ children }) => <h3 className="mb-1 mt-2 font-semibold text-foreground">{children}</h3>,
                    }}
                  >
                    {part.text}
                  </ReactMarkdown>
                ) : (
                  <span key={index}>{part.text}</span>
                )
              ) : null,
            )}
          </div>
        ))}
        {isResponsePending && (
          <div
            className="mr-3 flex w-fit items-center gap-1 rounded-xl bg-background px-3 py-2"
            role="status"
            aria-live="polite"
          >
            <span className="copilot-thinking-dot h-1.5 w-1.5 rounded-full bg-muted" />
            <span className="copilot-thinking-dot h-1.5 w-1.5 rounded-full bg-muted" />
            <span className="copilot-thinking-dot h-1.5 w-1.5 rounded-full bg-muted" />
            <span className="sr-only">Trace Kernel Copilot is thinking…</span>
          </div>
        )}
        {(error || modificationError) && (
          <div
            role="alert"
            className="mr-3 flex items-start gap-2 rounded-xl border p-2.5 text-sm leading-relaxed"
            style={{
              borderColor: "var(--error)",
              background: "color-mix(in oklab, var(--error) 10%, var(--surface))",
              color: "var(--foreground)",
            }}
          >
            <AlertCircle
              size={17}
              className="mt-0.5 shrink-0"
              style={{ color: "var(--error)" }}
              aria-hidden="true"
            />
            <p className="flex-1">
              {error
                ? "Trace Kernel Copilot unavailable — check your API key in settings."
                : modificationError}
            </p>
            <button
              type="button"
              onClick={() => {
                clearError();
                setModificationError(null);
              }}
              className="rounded p-0.5 text-muted transition hover:bg-surface-hover hover:text-foreground"
              aria-label="Dismiss Trace Kernel Copilot error"
            >
              <X size={15} />
            </button>
          </div>
        )}
      </div>
      <form className="border-t border-border p-3" onSubmit={send}>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask a question…"
            disabled={status !== "ready"}
            className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted disabled:cursor-not-allowed disabled:text-muted"
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={!canSend}
            className="text-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send size={15} />
          </button>
        </div>
      </form>
    </aside>
  );
}
