# CS Concept Simulator

An interactive computer science learning lab for exploring algorithms, operating systems, networking, systems programming, and language concepts through visual simulations.

## What it includes

- Full-screen 3D landing hero built with React Three Fiber and Drei
- Workspace overview with section cards and concept counts
- File-driven concept architecture: add a concept by adding content files
- Interactive simulations with play, pause, step, reset, and progress controls
- MDX explanations with C-style pseudocode, complexity cards, and pitfalls
- References per concept
- Persistent dark/light themes
- Floating AI copilot, hidden by default
- Lazy-loaded simulation, MDX, and landing-scene bundles

## Stack

Vite · React · TypeScript · React Router · Tailwind CSS · MDX · Framer Motion · React Three Fiber · Drei · Lucide React

## Development

~~~bash
npm install
npm run dev
npm run build
npm run preview
~~~

The app runs as a client-rendered SPA. No authentication, database, or user account is required.

## Add a concept

Create a folder under src/content/<section>/<concept>/ containing:

~~~text
meta.json
Simulation.tsx
logic.mdx
references.json
~~~

The registry, sidebar, routes, overview cards, and search index are derived automatically from the content tree.

## Deployment

Deploy the static Vite app to Vercel. The API routes read `AI_BASE_URL`, `AI_MODEL`, and `AI_API_KEY` only from server-side environment variables. Never commit API keys.

See context/PROJECT_CONTEXT.md for the complete implementation context and working conventions.
