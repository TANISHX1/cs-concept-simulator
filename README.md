# Trace Kernel

> An AI-powered learning platform that turns computer science algorithms into interactive, step-by-step visual simulations — with an agentic Concept Copilot that can explain, navigate, and modify simulations in real time.

<!-- Replace with an actual workspace screenshot before submission -->
<!-- ![Trace Kernel workspace](docs/screenshots/workspace.png) -->

## What it does

Trace Kernel transforms how students learn algorithms and data structures. Instead of reading static textbook diagrams, users can:

- **Explore curated concepts** — sorting algorithms, graph traversals, shortest paths, and scheduling — through animated, step-by-step array and graph visualizations.
- **Generate any concept on demand** — type a prompt like "red-black tree insertion" or "topological sort" and the AI produces a complete interactive simulation with pseudocode, complexity analysis, and common pitfalls.
- **Ask the Concept Copilot** — a context-aware AI assistant grounded in the current simulation state. It can explain the current step, compare trade-offs, and even **navigate the simulation programmatically** using tool calls.
- **Modify simulations in-place** — say "reverse the input" or "add 3 more nodes" and the AI (or the Copilot) rewrites the simulation while preserving chat history.

## How we built this with Codex

Codex served as the primary development partner throughout the build. Here are the key architecture decisions we made together:

- **Zod-validated simulation schema** — We defined a `SimulationSpecSchema` using Zod with discriminated unions (`"array"` vs `"graph"`) to enforce type-safe simulation data from AI responses, fixtures, and session storage.
- **OpenAI-compatible provider abstraction** — Built a provider factory (`aiProvider.ts`) using `@ai-sdk/openai-compatible` that routes to any standard endpoint (NVIDIA NIM, Groq, Ollama, OpenRouter) via base URL + model + API key — configurable per-request through browser headers.
- **Agentic tool calling** — The Copilot backend defines two tools (`setSimulationStep` and `modifySimulation`) using the AI SDK's `tool()` API with Zod input schemas. The frontend executes them via `addToolOutput` and auto-continues with `sendAutomaticallyWhen`.
- **LLM output normalization** — Open-source models return close-but-not-exact JSON. We built `normalizeRawSpec()` to patch common deviations (`op→type`, `nodeId→id`, flat complexity strings → nested objects, missing labels) before Zod validation.
- **Fixture-based demo mode** — 8 keyword-matched, high-fidelity fixture files enable a fully functional demo without any API key. The system detects keywords (e.g., "dijkstra", "merge sort", "round robin") and returns the matching simulation.
- **Session-scoped persistence** — Generated concepts are stored in `sessionStorage` and restored on page reload. Three demo fixtures pre-seed the Custom Simulations section on first visit.
- **BYO-key settings modal** — A browser-side settings panel stores provider credentials in `localStorage` and sends them as `x-api-key` / `x-base-url` / `x-model` headers, keeping secrets off the server's environment.

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Vite SPA (React + TypeScript + Tailwind)       │
│  ┌───────────┐ ┌───────────┐ ┌───────────────┐  │
│  │ Workspace │ │ ChatPanel │ │ GenerateInput │  │
│  │           │ │ (Copilot) │ │ + Variation   │  │
│  └─────┬─────┘ └─────┬─────┘ └──────┬────────┘  │
│        │              │              │           │
│  ┌─────▼──────────────▼──────────────▼────────┐  │
│  │  apiClient.ts  (BYO-key headers from       │  │
│  │                 localStorage settings)      │  │
│  └─────────────────────┬──────────────────────┘  │
└────────────────────────┼─────────────────────────┘
                         │  HTTP
┌────────────────────────▼─────────────────────────┐
│  Vercel Serverless Functions                      │
│  ┌──────────────┐ ┌────────┐ ┌────────────────┐  │
│  │ generate-    │ │ chat   │ │ modify-        │  │
│  │ simulation   │ │ (stream│ │ simulation     │  │
│  │ (generateText│ │  +tools│ │ (generateText  │  │
│  │  +normalize) │ │  )     │ │  +normalize)   │  │
│  └──────┬───────┘ └───┬────┘ └───────┬────────┘  │
│         └─────────────┼──────────────┘           │
│                       │                          │
│  ┌────────────────────▼──────────────────────┐   │
│  │  aiProvider.ts  (OpenAI-compatible factory)│   │
│  │  headers → env vars → defaults             │   │
│  └────────────────────┬──────────────────────┘   │
└───────────────────────┼──────────────────────────┘
                        │
        ┌───────────────▼───────────────┐
        │  Any OpenAI-compatible API    │
        │  (NVIDIA NIM / Groq / Ollama  │
        │   / OpenRouter / GPT-5.6)     │
        └───────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Tailwind CSS, Framer Motion |
| 3D Visualizations | React Three Fiber, Three.js |
| AI SDK | Vercel AI SDK (`ai`, `@ai-sdk/react`, `@ai-sdk/openai-compatible`) |
| Validation | Zod 4 (discriminated unions for simulation specs) |
| Navigation | React Router, cmdk (⌘K command palette) |
| Backend | Vercel Serverless Functions (Node.js) |
| Build | Vite 6, manual chunk splitting for Three.js |

## Local Development

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Set your AI provider key (Groq recommended for speed)
# AI_BASE_URL=https://api.groq.com/openai/v1
# AI_MODEL=llama-3.3-70b-versatile
# AI_API_KEY=gsk_your_key_here
# USE_FIXTURES=false

# Start the Vercel-compatible dev server
npx vercel dev
```

### Demo Mode (no API key required)

Leave `USE_FIXTURES` unset or set to `true`. The app serves 8 curated, keyword-matched fixture simulations covering:

| Fixture | Keywords matched |
|---|---|
| Bubble Sort | bubble, swap |
| Quick Sort | quick, partition, pivot |
| Merge Sort | merge, divide and conquer |
| Binary Search | binary search, sorted search |
| BFS | bfs, breadth, queue |
| DFS | dfs, depth, stack |
| Dijkstra | dijkstra, shortest, weighted |
| Round Robin | round robin, scheduling, quantum |

### Live AI Mode

Set `USE_FIXTURES=false` and provide an `AI_API_KEY`. Any OpenAI-compatible provider works:

| Provider | Base URL | Model |
|---|---|---|
| **Groq** (recommended, free, fastest) | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` |
| NVIDIA NIM | `https://integrate.api.nvidia.com/v1` | `meta/llama-3.3-70b-instruct` |
| Ollama (local) | `http://localhost:11434/v1` | `llama3.3` |
| OpenRouter | `https://openrouter.ai/api/v1` | Any supported model |

## Features

### 📚 Curated Concept Library
File-driven content system with metadata, simulation specs, logic explanations, and references. Organized into sections: Algorithms, Operating Systems, Networking, Systems, Languages.

### 🔮 AI-Powered Simulation Generation
Type any CS concept → get a complete interactive simulation with pseudocode, complexity analysis, and common pitfalls. Works with any OpenAI-compatible LLM.

### 🤖 Agentic Concept Copilot
Context-aware chat assistant with two AI SDK tools:
- **`setSimulationStep`** — navigates the visualizer to any step when the user asks "show me step 3"
- **`modifySimulation`** — rewrites the simulation in-place when the user asks "reverse the input" or "add more nodes"

### ✨ In-Place Variation Generator
Modify generated simulations without losing context. Available through both the dedicated Variation Input UI and the Copilot's tool-calling interface.

### ⌘ Command Palette
Cmd+K / Ctrl+K fuzzy search across all concepts, tags, and topics.

### 🎨 Theming & Accessibility
Dark/light mode toggle, `prefers-reduced-motion` support, semantic color tokens, and ARIA-labeled interactive elements.

## Production Build

```bash
npm run build
```

## Team

This project was built by a team of two contributors as part of the OpenAI Build Week hackathon.

## License

MIT
