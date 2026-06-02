---
"fancy-ui-svelte": patch
---

Fix bundle correctness and tighten the dependency surface:

- Export `Dock` (and `DockIcon`, `DockSeparator`) from the package entrypoint — the component was registered and shipped under `dist/`, but never re-exported, making it unreachable from `import { Dock } from "fancy-ui-svelte"`.
- Remove the dead `fluid-cursor-advanced` registry entry left over from the merge into `FluidCursor` — the component folder no longer exists, so the registry was advertising a non-shippable slug.
- Move `@vercel/analytics` from `dependencies` to `devDependencies` — it's only used by the docs site (`src/routes/+layout.svelte`) and was unnecessarily pulled into consumer installs.
- Drop the no-op `rewriteRelativeImportExtensions` flag from `tsconfig.json` — it has no effect with `moduleResolution: bundler` + SvelteKit's build pipeline.
- Fix README component count: `52`/`57` → `56`.
- Add `pnpm check:registry` (and run it in CI) — parses `src/lib/fancy-ui/registry.ts`, `src/lib/fancy-ui/index.ts`, and the component folders, and fails if they drift. Catches both quoted (`"book": { ... }`) and bare-identifier (`book: { ... }`) registry keys.
