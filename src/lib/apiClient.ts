export type AiSettings = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

export type AiExperienceMode = "demo" | "live";

const SETTINGS_KEY = "cs-sim-ai-settings";
const EXPERIENCE_MODE_KEY = "cs-sim-experience-mode";

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readSettings(value: string | null): AiSettings | null {
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(value);

    if (!parsed || typeof parsed !== "object") return null;

    const settings = parsed as Record<string, unknown>;

    if (
      typeof settings.apiKey !== "string" ||
      typeof settings.baseUrl !== "string" ||
      typeof settings.model !== "string"
    ) {
      return null;
    }

    return {
      apiKey: settings.apiKey,
      baseUrl: settings.baseUrl,
      model: settings.model,
    };
  } catch {
    return null;
  }
}

export function getAiSettings(): AiSettings | null {
  if (!canUseLocalStorage()) return null;

  try {
    return readSettings(window.localStorage.getItem(SETTINGS_KEY));
  } catch {
    return null;
  }
}

export function setAiSettings(settings: AiSettings) {
  if (!canUseLocalStorage()) return;

  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Local storage can be unavailable in private or restricted browsing modes.
  }
}

export function clearAiSettings() {
  if (!canUseLocalStorage()) return;

  try {
    window.localStorage.removeItem(SETTINGS_KEY);
  } catch {
    // Local storage can be unavailable in private or restricted browsing modes.
  }
}

export function getAiExperienceMode(): AiExperienceMode {
  if (!canUseLocalStorage()) return "demo";

  try {
    const mode = window.localStorage.getItem(EXPERIENCE_MODE_KEY);

    if (mode === "demo" || mode === "live") return mode;
  } catch {
    // Fall through to the backwards-compatible default below.
  }

  // Existing saved provider settings predate explicit mode selection.
  return getAiSettings()?.apiKey.trim() ? "live" : "demo";
}

export function setAiExperienceMode(mode: AiExperienceMode) {
  if (!canUseLocalStorage()) return;

  try {
    window.localStorage.setItem(EXPERIENCE_MODE_KEY, mode);
  } catch {
    // Local storage can be unavailable in private or restricted browsing modes.
  }
}

export function isLiveMode() {
  return (
    getAiExperienceMode() === "live" &&
    Boolean(getAiSettings()?.apiKey.trim())
  );
}

export function aiHeaders(): Record<string, string> {
  if (!isLiveMode()) return {};

  const settings = getAiSettings();

  if (!settings?.apiKey.trim()) return {};

  return {
    "x-api-key": settings.apiKey.trim(),
    "x-base-url": settings.baseUrl.trim(),
    "x-model": settings.model.trim(),
  };
}
