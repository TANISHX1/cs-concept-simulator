import { KeyRound, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import {
  getAiSettings,
  setAiExperienceMode,
  setAiSettings,
} from "../../lib/apiClient";

const DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1";
const DEFAULT_MODEL = "meta/llama-3.3-70b-instruct";

type SettingsForm = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

function getInitialSettings(): SettingsForm {
  const saved = getAiSettings();

  return {
    apiKey: saved?.apiKey ?? "",
    baseUrl: saved?.baseUrl || DEFAULT_BASE_URL,
    model: saved?.model || DEFAULT_MODEL,
  };
}

export function SettingsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [settings, setSettings] = useState<SettingsForm>(getInitialSettings);

  useEffect(() => {
    if (open) setSettings(getInitialSettings());
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  const update = (field: keyof SettingsForm, value: string) => {
    setSettings((current) => ({ ...current, [field]: value }));
  };

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAiSettings({
      apiKey: settings.apiKey.trim(),
      baseUrl: settings.baseUrl.trim() || DEFAULT_BASE_URL,
      model: settings.model.trim() || DEFAULT_MODEL,
    });
    setAiExperienceMode("live");
    onClose();
  };

  const useDemoMode = () => {
    setAiExperienceMode("demo");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-settings-title"
        className="w-full max-w-lg rounded-2xl border border-border bg-surface p-5 shadow-panel"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent-algorithms/15 text-accent-algorithms">
            <KeyRound size={17} aria-hidden="true" />
          </span>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted">
              AI provider
            </p>
            <h2 id="ai-settings-title" className="mt-1 text-lg font-semibold">
              Choose AI mode
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close AI settings"
            onClick={onClose}
            className="ml-auto rounded-md p-1 text-muted transition hover:bg-surface-hover hover:text-foreground"
          >
            <X size={17} />
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-muted">
          Demo mode keeps the curated library focused. Live mode sends this browser&apos;s provider settings only with your AI requests, while preserving your saved key when you switch back to Demo.
        </p>

        <form className="mt-5 space-y-4" onSubmit={save}>
          <label className="block text-sm font-medium text-foreground">
            Base URL
            <input
              value={settings.baseUrl}
              onChange={(event) => update("baseUrl", event.target.value)}
              placeholder={DEFAULT_BASE_URL}
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted"
            />
          </label>
          <label className="block text-sm font-medium text-foreground">
            Model
            <input
              value={settings.model}
              onChange={(event) => update("model", event.target.value)}
              placeholder={DEFAULT_MODEL}
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted"
            />
          </label>
          <label className="block text-sm font-medium text-foreground">
            API key
            <input
              type="password"
              autoComplete="off"
              value={settings.apiKey}
              onChange={(event) => update("apiKey", event.target.value)}
              placeholder="Enter a provider API key"
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted"
            />
          </label>

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={useDemoMode}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-hover hover:text-foreground"
          >
            Use Demo Mode
            </button>
            <button
              type="submit"
              disabled={!settings.apiKey.trim()}
              className="rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save &amp; Use Live AI
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
