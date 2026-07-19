import { useChat } from "@ai-sdk/react";
import { Bot, Send, X } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useActiveSimulation } from "../../components/simulation/ActiveSimulationContext";
import type { Meta } from "../../lib/types";

type ChatConcept = Pick<Meta, "title">;

export function ChatPanel({
  concept,
  open,
  onClose,
}: {
  concept?: ChatConcept;
  open: boolean;
  onClose: () => void;
}) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat();
  const activeSimulation = useActiveSimulation();
  const handledToolCallIds = useRef(new Set<string>());
  const scrollRef = useRef<HTMLDivElement>(null);
  const isStreaming = status === "streaming";
  const canSend = status === "ready" && input.trim().length > 0;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  useEffect(() => {
    if (!activeSimulation) return;

    for (const message of messages) {
      for (const part of message.parts) {
        if (
          part.type !== "tool-setSimulationStep" ||
          part.state !== "input-available" ||
          handledToolCallIds.current.has(part.toolCallId)
        ) {
          continue;
        }

        const toolInput = part.input;

        if (
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
      }
    }
  }, [activeSimulation, messages]);

  const send = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim();

    if (!text || status !== "ready") return;

    void sendMessage(
      { text },
      {
        body: {
          conceptTitle: concept?.title,
          simulationContext: activeSimulation?.groundingContext ?? undefined,
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
          <p className="text-sm font-medium">Concept copilot</p>
          <p className="text-[11px] text-muted">Context-aware learning help</p>
        </div>
        <button
          type="button"
          aria-label="Close concept copilot"
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
        {isStreaming && (
          <p className="mr-3 text-xs text-muted animate-pulse" aria-live="polite">
            Copilot is typing…
          </p>
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
