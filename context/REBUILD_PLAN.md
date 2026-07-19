# Rebuild Plan — AI Core of CS Concept Simulator

> **Status:** Approved by user on 2026-07-19. Ready for execution.
> **Scope:** Five in-scope pieces + two enablers. No edits made yet to source — this document is the source of truth for the rebuild.

---

## TL;DR of the 5 in-scope pieces + 2 enablers

| # | Piece | Status today | End state |
|---|---|---|---|
| 0 | `vercel dev` foundation | `/api/*` returns 503/404 in dev | Vite + `/api/*` both execute on `:5173` |
| 1 | Multi-provider model wiring | Hardcoded `openai("gpt-5.6")` in 2 files | Single `{AI_BASE_URL, AI_MODEL, AI_API_KEY}` env trio; default NVIDIA NIM `meta/llama-3.3-70b-instruct`; OpenAI-compatible SDK path |
| 2 | Demo/Live mode UI + BYO-key | None | localStorage-backed API-key modal; `x-api-key`/`x-base-url`/`x-model` headers on every `/api/*` fetch; fixtures power Demo mode automatically |
| 3 | Concept Copilot grounding | `concept` prop never sent | `{conceptId, currentStep, stateSnapshot}` in every chat request body; system prompt knows the context |
| 4 | `setSimulationStep` tool | Never built | Native `ai` SDK tool; Copilot can drive the active visualizer live ("show me step 3" → jumps) |
| 5 | Variation Generator (Touchpoint C) | Never built | Inside `/workspace/generated/<slug>`, "modify this simulation" sub-prompt emits a new `SimulationSpec` that swaps into the same view while preserving chat history |
| 6 | 6-8 keyword-matched fixtures | 2 generic fixtures | Hand-authored specs for quick-sort, merge-sort, dijkstra, bfs, dfs, binary-search, round-robin, tcp-handshake; `selectFixture` matches by keyword |

## Confirmed decisions (from Q&A round)

- **Open-source model path:** NVIDIA NIM primary via API key, Ollama possible — env-driven so any OpenAI-compatible endpoint works.
- **API key handling:** BYO-key in browser, sent as `x-api-key` / `x-base-url` / `x-model` headers per request. Fallback to server env `AI_API_KEY` if no browser header.
- **Default provider:** Env-driven single `AI_*` trio. Default `AI_BASE_URL=https://integrate.api.nvidia.com/v1`, `AI_MODEL=meta/llama-3.3-70b-instruct`.
- **Tool calling:** Native `ai` SDK `tools:` helper + `streamText`. Llama 3.3 70B via NIM supports it. No text-heuristic fallback in this push.
- **Demo fixtures:** Hand-author 6-8 keyword-matched fixtures so Generate returns different-looking sims per query.
- **Package manager:** npm (matches existing `package-lock.json` / Fedora 44 dev env).
- **In-scope (multi-select confirmed):** vercel dev foundation + Copilot grounding + API-key prompt UI + Variation Generator + setSimulationStep tool.

---

## Piece 0 — `vercel dev` foundation

**Why this is non-negotiable:** every other piece routes through `/api/*`. If Vite dev doesn't execute these, the Copilot/Generator/Variation endpoints all 503. This is literally the bug currently being hit.

### Files to change

**`vercel.json`** (new)
```json
{
  "version": 2,
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "vite --port 5173",
  "functions": {
    "api/chat.ts": { "runtime": "@vercel/node@5" },
    "api/generate-simulation.ts": { "runtime": "@vercel/node@5" },
    "api/modify-simulation.ts": { "runtime": "@vercel/node@5" }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/((?!api).*)", "destination": "/index.html" }
  ]
}
```

**`package.json`** — add devDep `"vercel": "^39"`, change `"dev"` script from `"vite"` → `"vercel dev --listen 5173"`.

**`api/chat.ts`** — convert from Cloudflare Workers shape (`export default { fetch }`) to Vercel Node shape (`export default async function handler(req, res)`) so the same runtime as `generate-simulation.ts` is used everywhere. Use `streamText({...}).pipeUIMessageStreamToResponse(res)` from `ai@7` (which writes directly to a Node `ServerResponse`).

**`api/generate-simulation.ts`** — no structural change, but the model line swaps (Piece 1).

**One-time setup to execute (with user)**: `npx vercel link --yes` → user does the browser login once → `.vercel/` cached locally (already gitignored).

---

## Piece 1 — Multi-provider model wiring (NVIDIA NIM default, Ollama-ready)

### New file `src/lib/aiProvider.ts`
```ts
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// Server-side factory: reads either process.env OR the per-request headers
export function getProvider(opts?: { baseUrl?: string; apiKey?: string; model?: string }) {
  const baseURL = opts?.baseUrl || process.env.AI_BASE_URL || "https://integrate.api.nvidia.com/v1";
  const apiKey  = opts?.apiKey  || process.env.AI_API_KEY  || "";
  const model   = opts?.model   || process.env.AI_MODEL   || "meta/llama-3.3-70b-instruct";

  if (!apiKey) throw new Error("AI_API_KEY missing");
  const provider = createOpenAICompatible({ name: "consim", baseURL, apiKey });
  return { provider, modelId: model };
}
```

**Why `@ai-sdk/openai-compatible`:** works with NVIDIA NIM, Ollama (`http://localhost:11434/v1`), OpenRouter, Together, Groq, vLLM — any OpenAI-spec endpoint. One SDK import, same `streamText` API.

**New devDep:** `@ai-sdk/openai-compatible`.

### `.env.example` (updated, comments only — actual values lazily entered)
```
# Live mode — provider-agnostic OpenAI-compatible endpoint
# Defaults to NVIDIA NIM. For Ollama: AI_BASE_URL=http://localhost:11434/v1, AI_MODEL=llama3.1
# For OpenRouter: AI_BASE_URL=https://openrouter.ai/api/v1, AI_MODEL=meta-llama/llama-3.3-70b-instruct
AI_BASE_URL=
AI_MODEL=
AI_API_KEY=

# Demo mode — set to true to force fixtures and ignore any AI_* config
USE_FIXTURES=true
```

### `api/chat.ts` rewrite (sketch)
```ts
import { convertToModelMessages, streamText, tool, type UIMessage } from "ai";
import { getProvider } from "../src/lib/aiProvider";
import { z } from "zod";

export default async function handler(req, res) {
  // ... auth/body parsing ...
  const baseUrl = req.headers["x-base-url"] as string | undefined;
  const apiKey  = req.headers["x-api-key"] as string | undefined;
  const model   = req.headers["x-model"]   as string | undefined;

  let provider;
  try { provider = getProvider({ baseUrl, apiKey, model }); }
  catch { return res.status(503).json({ error: "AI provider not configured" }); }

  const messages = await convertToModelMessages(body.messages as UIMessage[]);
  const result = streamText({
    model: provider.provider.chatModel(provider.modelId),
    messages,
    tools: {
      setSimulationStep: {
        description: "Jump the visualizer to a specific step. Call when user asks to 'show step N', 'go to N', etc.",
        parameters: z.object({ index: z.number().int().min(0) }),
      },
    },
    system: buildSystemPrompt(body.context),  // Piece 3
  });
  return result.pipeUIMessageStreamToResponse(res);
}
```

### `api/generate-simulation.ts` rewrite (sketch)
```ts
import { generateObject } from "ai";
import { getProvider } from "../src/lib/aiProvider";
import { SimulationSpecSchema } from "../src/lib/simulationSpec";

// ... existing fixture selection logic stays for USE_FIXTURES=true path ...
const { provider, modelId } = getProvider({
  baseUrl: req.headers["x-base-url"],
  apiKey:  req.headers["x-api-key"],
  model:   req.headers["x-model"],
});
const { object } = await generateObject({
  model: provider.chatModel(modelId),
  schema: SimulationSpecSchema,
  system: generationInstructions,
  prompt: query,
});
return res.status(200).json(object);
```

### `api/modify-simulation.ts` (new — Piece 5)

Same shape as `generate-simulation.ts` but the prompt includes `{currentSpec, modificationRequest}` and the system prompt constrains to "modify in place, keep the same visualType".

---

## Piece 2 — Demo/Live mode UI + BYO-key

### New file `src/features/settings/SettingsModal.tsx`
- Triggered from header "Demo Mode · Use Live AI" button.
- Modal with three fields: Base URL (default `https://integrate.api.nvidia.com/v1`), Model (default `meta/llama-3.3-70b-instruct`), API key (password input).
- Stored in `localStorage` under `cs-sim-ai-settings`.
- "Use Demo (no key)" toggle to clear and revert.

### New file `src/lib/apiClient.ts`
```ts
export function aiHeaders(): Record<string,string> {
  const s = JSON.parse(localStorage.getItem("cs-sim-ai-settings") || "null");
  if (!s?.apiKey) return {};  // demo mode: no headers, server falls back to fixtures (USE_FIXTURES=true)
  return {
    "x-api-key": s.apiKey,
    "x-base-url": s.baseUrl,
    "x-model": s.model,
  };
}
export const isLiveMode = () =>
  Boolean(JSON.parse(localStorage.getItem("cs-sim-ai-settings") || "null")?.apiKey);
```

### Call-site updates
- `api/generate-simulation.ts` — if no `x-api-key` header received **and** `USE_FIXTURES !== "false"` → return `selectFixture(query)`. Headers present → real generation.
- `api/chat.ts` — if no `x-api-key` header and no server env → return 503 with `{error:"Copilot is not configured — switch to Live mode"}`. Fixtures don't power chat (too expensive to fake).
- `GenerateInput.tsx`: prepend `aiHeaders()` to its fetch.
- `ChatPanel.tsx`: pass `aiHeaders()` through `useChat({ body: {...}, headers: aiHeaders() })`.

### Header UI change in `Workspace.tsx`
- Replace the dead "Search" button (Lines 305-310) with a "Demo Mode ⌥ / Use Live AI" pill toggle.
- Persistence: `localStorage`.

---

## Piece 3 — Concept Copilot grounding

### `ChatPanel.tsx` changes
Currently takes `concept?: Meta`. Extend to also accept `currentStep: number` and `stateSnapshot: object` (lifted from the active visualizer). Pass all three through `useChat`'s `body`:

```ts
const { messages, sendMessage, status } = useChat({
  body: {
    context: {
      conceptId: concept?.path,
      conceptTitle: concept?.title,
      conceptSection: concept?.section,
      currentStep,
      stateSnapshot,  // the rendered items / visited nodes / etc.
    },
  },
  headers: aiHeaders(),
});
```

### Lift visualizer state up
Currently `ArrayVisualizer` and `GraphVisualizer` own `currentStep` internally. Need to expose it to `Workspace.tsx`. Two options:
- **Controlled mode (recommended):** pass `currentStep` and `onStepChange` from `Workspace.tsx` into the visualizer (both already accept this via `ArrayVisualizerProps.currentStep`/`onStepChange` — Lines 14-18 of `ArrayVisualizer.tsx`). Read the current step state up and feed all three Tabs (Simulation/Logic/References) a shared `currentStep` ref.
- For static concepts like `quick-sort/Simulation.tsx` (which pre-bakes its state array): add a non-breaking optional `onStepChange` prop pattern — these don't need to drive the Copilot.

The **generated concept path** will be refactored first (where the engines are reused) so Touchpoint C's Variation Generator works there. Static concepts get grounding for the current step only.

### Server-side `buildSystemPrompt(context)`
```ts
function buildSystemPrompt(ctx) {
  return `You are the Concept Copilot inside an interactive CS learning app.
The user is currently viewing: "${ctx.conceptTitle}" (section: ${ctx.conceptSection}).
They are on step ${ctx.currentStep} of the simulation. The state at this step:
${JSON.stringify(ctx.stateSnapshot)}
Explain clearly, reference the current step when relevant, and use the setSimulationStep tool when the user asks to jump to any step.`;
}
```

---

## Piece 4 — `setSimulationStep` tool

### Tool definition (in `api/chat.ts` as shown in Piece 1)
```ts
tools: {
  setSimulationStep: {
    description: "Jump the visualizer to a specific step index.",
    parameters: z.object({ index: z.number().int().min(0) }),
  },
}
```

### Client-side tool execution via `useChat`'s `onToolCall`
The Vercel AI SDK invokes this callback client-side when the model calls the tool.

```ts
const { messages, sendMessage, status } = useChat({
  // ... body, headers ...
  onToolCall({ toolCall }) {
    if (toolCall.toolName === "setSimulationStep") {
      const { index } = toolCall.args;
      setCurrentStepGlobal(index);  // lifts via Workspace context
      return { success: true };  // AI SDK requires a return
    }
  },
});
```

### `Workspace.tsx` lift-up
Add `currentStep` state at the Workspace level + a `setCurrentStep` callback, threaded down to the active visualizer. Refactor the static-concept Simulation.tsx paths to opt in (they currently manage their own step — for those, add an `onStepChange` lift for grounding but the tool calls skip them, since static concepts don't drive the AI loop by spec).

The **generated concept path** (`/workspace/generated/<slug>`) is the one made fully tool-callable.

---

## Piece 5 — Variation Generator (Touchpoint C)

### New file `src/features/generate/VariationInput.tsx`
Renders **inside** a generated concept's Simulation tab, below the visualizer. A small prompt input "Modify this simulation…" (e.g., "show reverse-sorted input", "swap the pivot to the median", "use 10 nodes instead of 6") + a Send button.

### Flow
1. User types modification request.
2. `VariationInput` POSTs to `/api/modify-simulation` with `{currentSpec, modificationRequest, context: {conceptId, currentStep}}` + `aiHeaders()`.
3. Server constructs a system prompt: "You are modifying an existing SimulationSpec. Keep the same visualType. Return only the new spec."
4. `generateObject({ schema: SimulationSpecSchema, ... })` returns the new spec.
5. Client calls `addGeneratedConcept(newSpec)` (re-uses the existing sessionStorage merge) → but instead of navigating to a new slug, **swaps the spec in the current route** using a new `replaceGeneratedConcept(slug, newSpec)` method added to `GeneratedConceptsContext`.
6. Chat history stays (useChat state in ChatPanel persists across the spec swap because ChatPanel is mounted outside Suspense per spec §7).
7. Visualizer re-renders from the new spec; step pointer resets to 0.

### Demo mode behavior
In Demo mode (`USE_FIXTURES=true` and no `x-api-key`), `/api/modify-simulation` runs a deterministic transform on the current spec rather than calling AI:
- "reverse" → reverses `initialState` / `steps`
- "more nodes" → procedurally extends the graph fixture
- "bigger array" → scales `initialState` and re-derives `steps` for bubble sort

Not as rich as AI, but enough that the demo flow looks alive.

---

## Piece 6 — 6-8 keyword-matched fixtures

### Files to create under `src/content/seed/`

| Fixture | Visual | Keywords that match |
|---|---|---|
| `bubble-sort.fixture.json` (existing, keep) | array, 6 bars | "bubble", "swap near" |
| `quick-sort.fixture.json` | array, 8 bars, pivot highlight | "quick", "partition", "pivot" |
| `merge-sort.fixture.json` | array, 8 bars, divide/merge phases | "merge", "divide and conquer" |
| `binary-search.fixture.json` | array, 16 sorted bars, lo/mid/hi pointers | "binary", "search", "sorted search" |
| `bfs.fixture.json` (existing graph fixture, keep) | graph, 6 nodes | "bfs", "breadth", "queue" |
| `dfs.fixture.json` | graph, same 6 nodes, stack-based | "dfs", "depth", "stack" |
| `dijkstra.fixture.json` | graph, weighted edges, relaxation steps | "dijkstra", "shortest", "weighted" |
| `round-robin.fixture.json` | array of process objects with `remaining/burst` (needs a small `processArray` visual — recommended: just render as multi-row Gantt-style bars reusing ArrayVisualizer with `value`-as-height replaced by width) | "round", "scheduling", "rr", "quantum" |

That's 8 fixtures (6 new). For round-robin and tcp either (a) accept them falling back to the closest visual match (round-robin → array, tcp → graph) or (b) add minimal rendering for them in `DynamicSimulation.tsx`'s fallback path (the `StepListFallback` already exists — extend it slightly for "process list" rendering).

### Extended `selectFixture(query)`
```ts
const fixtureMatchers: { pattern: RegExp; fixture: SimulationSpec }[] = [
  { pattern: /\b(bubble)\b/i, fixture: bubbleSortFixture },
  { pattern: /\b(quick|partition|pivot)\b/i, fixture: quickSortFixture },
  { pattern: /\b(merge)\b/i, fixture: mergeSortFixture },
  { pattern: /\b(binary search|sorted search)\b/i, fixture: binarySearchFixture },
  { pattern: /\b(bfs|breadth)\b/i, fixture: bfsFixture },
  { pattern: /\b(dfs|depth)\b/i, fixture: dfsFixture },
  { pattern: /\b(dijkstra|shortest|weighted)\b/i, fixture: dijkstraFixture },
  { pattern: /\b(round.?robin|scheduling|quantum)\b/i, fixture: roundRobinFixture },
];
return fixtureMatchers.find(m => m.pattern.test(query))?.fixture ?? bubbleSortFixture;  // safe default
```

Inputs to `selectFixture` also accept the fixture object from `import.meta.glob('/src/content/seed/*.fixture.json', {eager:true})` so they get the same Vite build treatment as the existing two.

---

## Execution order (when "go" is said)

Executed in this dependency order, with verification gates between each.

1. **Foundation** — `npm i -D vercel @ai-sdk/openai-compatible`, create `vercel.json`, rewrite `api/chat.ts` to Node shape (no provider swap yet, no tool yet — just the conversion so the endpoint runs at all). Add `api/modify-simulation.ts` as a placeholder returning 200. Update `package.json` scripts (`dev` → `vercel dev --listen 5173`).
   - **Gate:** run `npx vercel link --yes`, user logs in once, run `npx vercel dev`, curl `/api/generate-simulation` body `{"query":"bubble sort"}` with `USE_FIXTURES=true` → expect 200 + array fixture JSON (proves Piece 0 works).
2. **Provider abstraction** — create `src/lib/aiProvider.ts`, rewrite model-call sites in `generate-simulation.ts` and `chat.ts` to use it. Keep fixture path intact.
3. **Fixtures** — author 6 new fixture JSONs + refine `selectFixture` matcher.
   - **Gate:** curls against 4 different queries → 4 distinct fixture responses. Generate button → distinct visuals per query.
4. **API-key UI** — `SettingsModal`, `aiClient.ts`, header toggle button replacing dead Search button, `GenerateInput` + `ChatPanel` send headers.
   - **Gate:** enter a fake-but-valid-looking NVIDIA NIM key → notice the modal persists across reloads; clear key → reverts to Demo.
5. **Copilot grounding** — lift `currentStep` + `stateSnapshot` from visualizer to `Workspace.tsx` for generated concept path; pass into `useChat` body; server `buildSystemPrompt` consumes it.
6. **`setSimulationStep` tool** — add tool def in chat handler, `onToolCall` client-side, `setCurrentStepGlobal` wired to visualizer.
   - **Gate:** in Live mode with a real NVIDIA NIM key, ask Copilot "show me step 3" inside a generated concept → visualizer jumps to step 3 live.
7. **Variation Generator** — `VariationInput.tsx`, `replaceGeneratedConcept` in context, `/api/modify-simulation` handler, deterministic fallbacks in Demo mode.
   - **Gate:** in Live mode, ask "show me reverse-sorted input" → spec swaps in place; in Demo mode, "reverse" → reverses the current fixture's spec visibly.

---

## Open risks (so the demo isn't surprising)

1. **NVIDIA NIM Llama 3.3 70B structured output reliability** — generally good at JSON schema-following; for the discriminated-union `SimulationSpecSchema` (16-case union), if it produces invalid `steps`, the `zodResponseFormat` equivalent (`generateObject` with the schema) will retry once. If it fails twice, surface a "try rephrasing" message. **No code change needed**, but expect ~5-10% of generations to fail on natural prompts in Live mode. The fixtures cover Demo mode flawlessly.

2. **Tool-call latency on NVIDIA NIM** — Llama 3.3 70B is hosted, not streaming-fast like Anthropic/GPT; expect ~500-1500ms time-to-first-token for chat, plus tool call round-trip. If the judge is impatient, "show me step 3" will feel slightly slow. Mitigation already in the plan: streaming via `pipeUIMessageStreamToResponse` means incremental text appears fast.

3. **`vercel dev` cold-start on first `/api/*` hit is ~2-3s** on Fedora (Node Workers boot). Subsequent requests are instant. Will warn about this in the README so the demo's first click doesn't surprise.

4. **Round-robin / TCP fixtures forcing addition of rendering primitives** — the existing `DynamicSimulation.tsx` only knows `array` and `graph`. For the round-robin and tcp-handshake fixtures either (a) accept them falling back to the closest visual match (round-robin → array, tcp → graph) or (b) add minimal rendering for them in `DynamicSimulation.tsx`'s fallback path (the `StepListFallback` already exists — extend it slightly for "process list" rendering). Will pick (b) if it's under 60 lines, otherwise (a) for demo pragmatism.

5. **One-time `vercel` login requires a network connection.** If demoing at a venue with bad wifi, do the login the night before. After login, `vercel dev` works offline (the API still calls the provider endpoint though — Live mode needs internet to reach NVIDIA NIM anyway).

6. **Hackathon rules** — user said skip them; proceeding without warnings. Noting for the user's own liability that "use of OpenAI" rules in the small print may still bite at judging. User's call, user's risk.

---

## Files that will change (summary table)

| File | Action |
|---|---|
| `package.json` | +devDeps: `vercel`, `@ai-sdk/openai-compatible`; change `dev` |
| `vercel.json` | create |
| `.env.example` | update comments |
| `api/chat.ts` | rewrite to Node shape + provider-aware + tool calling |
| `api/generate-simulation.ts` | provider-aware + enhanced fixture matching |
| `api/modify-simulation.ts` | create |
| `src/lib/aiProvider.ts` | create |
| `src/lib/apiClient.ts` | create |
| `src/features/settings/SettingsModal.tsx` | create |
| `src/features/generate/VariationInput.tsx` | create |
| `src/features/chat/ChatPanel.tsx` | add grounding + tool handler + headers |
| `src/features/generate/GeneratedConceptsContext.tsx` | add `replaceGeneratedConcept` |
| `src/pages/Workspace.tsx` | header pill, lift `currentStep`, render `VariationInput` in generated route |
| `src/components/simulation/DynamicSimulation.tsx` | (maybe) minor fallback for round-robin/tcp |
| `src/content/seed/*.fixture.json` | +6 new fixtures |
| `src/lib/utils.ts` or new `src/lib/fixtureMatcher.ts` | enhanced `selectFixture` (export from a shared module the API can also import) |

---

## End state — what the user's vision maps to after this rebuild

| User's stated desire | After rebuild |
|---|---|
| Pick a topic → see default simulation | ✅ Already works (untouched) |
| Inside it, call Concept Copilot for step explanation + concept clarity | ✅ Chat panel grounded in `{concept, currentStep, stateSnapshot}`; answers reference the live step |
| Copilot can manipulate the simulation live ("show me step 3") | ✅ `setSimulationStep` tool drives the active visualizer |
| Central "generate custom simulation" for topics not in library | ✅ `GenerateInput` + NVIDIA NIM/Ollama generation in Live mode; fixture-matched variety in Demo mode (8 keyword-matched fixtures) |
| Inside a generated concept, manipulate the sim and keep asking questions | ✅ `VariationInput` + `replaceGeneratedConcept` swaps the spec in-place; chat history persists |
| Demo should look dynamic without API key | ✅ Demo mode banner + 8 keyword-matched fixtures returning distinct-looking sims |
| Real mode asks for API key | ✅ Header "Use Live AI" toggle → modal → BYO-key in localStorage → `x-api-key` headers per request |
| Open-source model instead of OpenAI | ✅ NVIDIA NIM Llama 3.3 70B default; Ollama/OpenRouter/others via env swap; OpenAI-compat SDK path |

---

**Plan is complete and ready.** When "go" is said, execution starts with Step 1 (foundation) and proceeds through the verification gates as described.
