# CS Concept Simulator — AI Project Context

This document is the working memory for future AI coding sessions. It records product decisions, implementation details, visual rules, routes, content conventions, and current status. Treat it as the project source of truth together with the original specification.

## Product purpose

CS Concept Simulator is a client-rendered learning workspace. It makes computer science concepts tangible through interactive visual simulations, structured explanations, C-style pseudocode, complexity summaries, pitfalls, references, and an optional concept-aware AI copilot.

There is no login, authentication, database, CMS, account system, or persistent server-side user data.

## Technology and constraints

- Vite + React + TypeScript, strict mode.
- React Router v6.
- Tailwind CSS with semantic CSS variables.
- MDX for concept explanations.
- Framer Motion for simulation transitions.
- React Three Fiber + Drei for the landing page only.
- Lucide React for icons.
- No Redux, Zustand, MobX, SSR, or SSG.
- No hardcoded navigation structure; navigation comes from the content registry.
- No hardcoded colors in simulations. Use theme tokens.
- Pseudocode convention: C-style syntax with typed declarations, braces, semicolons, and C-like function signatures.

## Important routes

- / — full-screen landing page with the lazy-loaded 3D hero.
- /workspace — workspace overview showing every registered section.
- /workspace/<section> — intermediate section overview.
- /workspace/<concept-path> — concept workspace with Simulation, Logic, and References tabs.
- Unknown workspace paths — clean in-shell not-found state.

The landing page primary action routes to /workspace. Section browsing does not live on the landing page.

## Workspace behavior

The workspace has a compact header, breadcrumbs, theme toggle, search affordance, and a copilot toggle.

The Library sidebar:

- Is hidden on the root workspace overview.
- Appears after entering a section or concept.
- Has a hide control and a narrow restore control.
- Renders the registry tree, not hardcoded links.

The AI chat:

- Is hidden by default.
- Opens from the header bot icon.
- Floats above the content rather than consuming workspace width.
- Uses roughly half the viewport height and a compact fixed width.
- Closes with an X button.
- Keeps local session messages while the workspace remains mounted.

The main content preserves maximum width for simulations and future synchronized code execution views.

## Landing page

The landing page uses the full viewport width. It contains the brand mark on the left, no top-right workspace link, a full-screen R3F background visual, a headline positioned slightly left, a 3D visual field nudged slightly right, and one primary Enter the lab action routed to /workspace.

The scene represents the subject matter with a rotating graph of connected nodes, a wireframe icosahedron core, orbital torus rings, floating wireframe data fragments, stars, spark particles, mouse parallax, and slow autonomous motion.

The scene is lazy-loaded so Three.js is not loaded on workspace routes.

## Theme system

Theme state lives in ThemeProvider, is applied to the html data-theme attribute, and persists under localStorage key cs-sim-theme.

Dark tokens follow the Vercel-like near-black system. Light tokens use the warm buttery palette. Semantic tokens include background, surfaces, borders, foreground text, section accents, status colors, and code syntax colors.

Code syntax tokens are --code-surface, --code-foreground, --code-keyword, --code-function, --code-variable, and --code-number.

Use accent colors for icons, badges, active states, borders, and simulation highlights. Do not use them as paragraph/body text.

## Content plugin contract

Every concept folder under src/content must contain:

~~~text
meta.json
Simulation.tsx
logic.mdx
references.json
~~~

meta.json contains id, title, section, parentPath, order, difficulty, tags, prerequisites, summary, and accentSection.

Simulation.tsx must default-export a standalone React component. It owns its state, uses theme tokens, and keeps controls keyboard accessible.

logic.mdx should be structured, not a wall of text. Use dedicated sections for the concept/problem, core idea or invariant, algorithm steps, C-style pseudocode, time and space complexity, and common pitfalls.

Inline React components are acceptable when MDX parsing remains stable. For complex colored code, prefer a dedicated .tsx component imported explicitly with its .tsx extension.

references.json is an array of title/type/source/url/verified objects.

## Registry implementation

src/lib/contentLoader.ts uses Vite import.meta.glob to eagerly load metadata and references, lazily load simulations and MDX, build conceptTree, build flatConceptIndex, expose getConceptByPath, and expose sectionLabels.

Adding a concept should not require edits to routes, sidebar code, or app shell code.

## Current content

Currently registered:

- algorithms/sorting/merge-sort

Merge Sort has an animated bar simulation, play/pause/step/reset controls, C-style colored pseudocode, structured logic cards, complexity cards, common pitfalls, and a verified reference.

Operating Systems, Networking, Systems, and Languages are intentionally empty and display the no-concepts state.

## Current source layout

~~~text
src/
  app/                 app root, router, providers
  pages/               Landing, Workspace, HeroScene
  content/             file-driven concept plugins
  features/
    sidebar/           Library tree
    chat/              floating copilot
    references/        reference cards
    theme/             theme provider/toggle
  components/ui/       shared UI primitive location
  lib/                 registry, types, utilities
  styles/              tokens and global styles
api/chat.ts            single serverless chat endpoint
~~~

## AI/API status

api/chat.ts validates the request method and message, checks GEMINI_API_KEY, and currently returns a safe pending-adapter response. The Gemini request/response integration still needs to be implemented before deployment as a functional AI service.

The key must remain server-side and must never be imported into the client bundle.

## Visual and interaction rules

- Keep the native OS / IDE feel: restrained surfaces, thin borders, compact controls, and strong typography.
- Prefer intentional motion over constant decorative motion.
- Respect keyboard focus and reduced-motion behavior when adding interactions.
- Keep simulations and explanations readable before adding ornament.
- Preserve the full-width landing visual and maximum simulation workspace area.
- Use explicit empty states for sections without concepts.
- Do not reintroduce landing-page section cards; those belong in /workspace.

## Verification

Run:

~~~bash
npm run build
~~~

The current build succeeds. Vite may report a non-blocking warning that the lazy Three.js chunk is larger than 500 kB.
