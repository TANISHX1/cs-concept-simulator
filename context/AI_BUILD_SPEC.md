# CS Concept Simulator — Master Project Context & Specification

> **Document Purpose:** Source of truth for the AI build agent (Codex). This document dictates product decisions, implementation details, visual rules, strict technical constraints, and the step-by-step phased roadmap. Do not deviate from these rules without explicit instruction.

---

## 1. Project Purpose & Paradigm Shift

**The CS Concept Simulator** is a strictly client-rendered educational workspace that makes computer science concepts tangible through visual simulations, structured MDX explanations, and C-style pseudocode.

**The Paradigm Shift (Static → Generative):** The platform operates as an AI-native generative learning platform. If a user asks for a concept that isn't pre-authored in the library, the app generates the simulation, pseudocode, and explanation on the fly using OpenAI structured JSON outputs. Generated content is immediately treated as a native part of the app.

**Core Rules:**
- Zero friction: no login, no accounts, no backend database.
- State-driven extensibility: sidebar and search derive entirely from content state (static filesystem + runtime storage). Adding a concept requires zero app-shell or routing changes.
- Premium native aesthetic: Vercel / Linear / VS Code register, not a marketing site.

---

## 2. Technology Stack & Strict Constraints

### 2.1 Allowed Technologies
- **Core:** Vite + React (SPA), TypeScript strict mode.
- **Routing:** React Router v6, client-side only.
- **Styling:** Tailwind CSS + Radix UI primitives (shadcn/ui).
- **Animation:** Framer Motion for UI transitions and simulation orchestration.
- **Content:** MDX for logic/explanations.
- **AI Backend:** Vercel/Netlify serverless functions calling the OpenAI API.
- **AI Model:** **`gpt-5.6`** — pinned explicitly. Do not use generic fallback strings.
- **State persistence:** React Context, URL state, `sessionStorage` (for generated concepts), `localStorage` (for themes).

### 2.2 Prohibited Technologies
- **No** Next.js, Remix, SSR, or SSG — this is a pure Vite SPA.
- **No** Redux, Zustand, or MobX — React Context is sufficient.
- **No** hardcoded hex/rgb colors — semantic CSS variables only.
- **No** client-side exposure of `OPENAI_API_KEY` — must be server-side only.

---

## 3. Development Strategy (Fixture-First)
To optimize API usage and ensure robust frontend engines, you must implement a **dev-only bypass** in `api/generate-simulation.ts`:
- If `USE_FIXTURES=true` is set, the endpoint must return a matching local JSON fixture instead of calling `gpt-5.6`.
- The frontend visualizers (`ArrayVisualizer`, `GraphVisualizer`) must be built and animated entirely against these local JSON fixtures first. 

---

## 4. Core Architecture: The Dual-Branch Content System

### 4.1 The Static Branch (file-driven plugin system)
Curated concepts live in `src/content/<section>/<concept>/`, each folder containing:
1. `meta.json` — `{ id, title, section, parentPath, order, difficulty, tags, prerequisites, summary, accentSection }`
2. `Simulation.tsx` — standalone component, shared `SimulationControls`, theme tokens only.
3. `logic.mdx` — Problem, Invariant, Steps, C-style pseudocode, Time/Space complexity, Pitfalls.
4. `references.json` — array of curated links.

`contentLoader.ts` eagerly loads metadata via `import.meta.glob` and builds the static `conceptTree`.

### 4.2 The Generated Branch (AI-driven system)
1. **The Contract (`src/lib/simulationSpec.ts`)** — Zod schema. Fields: `title`, `visualType` (`array | graph | tree`), `initialState`, `steps` (typed operations, e.g. `{ type: 'SWAP', indices: [0,1] }`, `{ type: 'VISIT_NODE', id: 'n3' }`), `pseudocode`, `complexity`, `pitfalls`.
2. **The Engines** — `ArrayVisualizer.tsx`, `GraphVisualizer.tsx`, `TreeVisualizer.tsx`. Reusable renderers that consume a `SimulationSpec` step array and animate via Framer Motion. 
3. **The Router (`DynamicSimulation.tsx`)** — reads `visualType`, mounts the correct engine.
4. **Persistence & Merging** — generated JSON is saved to `sessionStorage`. `contentLoader.ts` parses this at runtime and splices a "Generated" branch into `conceptTree`, so it appears in the Sidebar exactly like static content.

---

## 5. Layout, Routing & UX Rules

### 5.1 Routes
- `/` — landing page, lazy-loaded R3F hero, no Three.js on workspace routes.
- `/workspace` — global overview, all sections.
- `/workspace/<static-concept-path>` — filesystem concepts.
- `/workspace/generated/<slug>` — in-memory generated concepts.
- Fallback — clean in-shell 404 containing `GenerateInput.tsx`.

### 5.2 Workspace Shell (3-pane)
- **Header** — logo, breadcrumbs, theme toggle.
- **Left sidebar** — collapsible Library tree, renders the unified `conceptTree`.
- **Main content** — Tabs: Simulation | Logic | References.
- **Right panel (Copilot)** — fixed-width (~350px) floating chat card.

### 5.3 Aesthetic
- Dark: `--background: #0a0a0a`, `--surface: #111111`.
- Light: `--background: #faf8f3`, `--surface: #f0ece2` — no pure white/black.
- Accent colors per section, `oklch`, used strictly for active states/badges/highlights — never body text.

---

## 6. Advanced AI Interactivity (The Copilot)

`api/chat.ts`, model **`gpt-5.6`**:
1. **Token streaming** via Vercel AI SDK `streamText`.
2. **Function calling (`setSimulationStep(index)`)** — "Show me step 3" moves the visualizer to that exact state live.
3. **Click-to-explain grounding** — Clicking a bar, node, or pseudocode line dispatches `{ conceptId, currentStep, stateSnapshot }` into the chat context, grounding the AI in the exact moment on screen.

---

## 7. Execution Roadmap (Day-Boxed)

When executing tasks, follow this order precisely.

### Day 1: Foundation & Static Polish
- Fix every model reference to `gpt-5.6` in the codebase.
- Confirm the merge sort baseline is solid.
- Add **quicksort** as the second static concept (reuses the array visualizer engine).
- Write `simulationSpec.ts` — Zod schema, typed step operations.
- Generalize merge sort's bar rendering into a shared `ArrayVisualizer.tsx`.

### Day 2: The Generative Engine
- Build `api/generate-simulation.ts` with `zodResponseFormat` + `gpt-5.6`. Include the `USE_FIXTURES=true` bypass.
- Build `GenerateInput.tsx` + `DynamicSimulation.tsx`.
- Wire the `sessionStorage` branch into `contentLoader.ts`; add the `/workspace/generated/<slug>` route.

### Day 3: Copilot & Interactivity
- Rewire `api/chat.ts` to `gpt-5.6`; implement `setSimulationStep` function calling.
- Wire click-to-explain grounding from the visualizers to the chat context.
