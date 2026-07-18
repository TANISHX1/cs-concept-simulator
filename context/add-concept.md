# Add-concept authoring guide

## Summary

Create `context/ADDING_A_CONCEPT.md`, a practical manual for manually populating sections with concepts. It will clearly separate what works now from the optional traced-concept format planned for the synchronized code-execution feature.

## Contents

- Explain the required four-file concept folder:
  - `meta.json`
  - `Simulation.tsx`
  - `logic.mdx`
  - `references.json`
- Document the optional fifth file, `trace.json`, as reserved for the future synchronized simulation/code-trace view.
- Include the exact folder naming and nesting convention, with examples for a direct section concept and a nested concept.
- Provide copy-ready JSON templates for metadata and references, including valid enum values for difficulty and reference type.
- Define the `Simulation.tsx` contract: default export, standalone behavior, Framer Motion, token-based colors, keyboard-accessible standard controls, and C-style pseudocode alignment.
- Define the required Logic structure: overview, core idea/invariant, step sequence, C-style pseudocode, time/space complexity, and pitfalls.
- Add a concise author checklist: kebab-case IDs/folders, valid URLs, content path/prerequisites, no router/sidebar edits, run `npm run build`.
- State the current implementation note: the four core files are recognized now; `trace.json` is documented for when the trace registry/workbench feature is implemented.

## Validation

- Verify all examples match the current `Meta` and `Reference` types.
- Verify paths and filenames match the content loader glob patterns.
- Keep the guide separate from the full specification so it is quick for manual authors to follow.
