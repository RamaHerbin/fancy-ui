# fancy-ui-react

## 0.2.0

### Minor Changes

- d90d317: First published release of fancy-ui-react. The package joins the repo's pnpm
  workspace, so Changesets discovers and publishes it through the existing
  release pipeline. The build now preserves module boundaries (one dist file per
  source module) so consumers tree-shake unused components, and every built
  module carries the `"use client"` directive for React Server Component apps.
- f4e7511: Production review of the React port: fidelity, React quality and package readiness.
  - **Fidelity**: the `sound` prop (opt-in interface cues) now exists on every component that has it on the Svelte side (57 additions), with the same cue names, trigger moments and guards; anchored surfaces measure their panel from the layout box so the entrance transform no longer offsets popovers, hover cards and menus; Popover positions before it arms its focus trap; a second right-click repositions a ContextMenu; twenty-three components mirror the parity fixes landed on the Svelte side (accessible names, focus handling, listener teardown, single animation loops, unique keys).
  - **React quality**: mount effects are idempotent under StrictMode (CommandMenu query, FormField valid glyph, Tabs entrance, TextRoll direction, LiquidText and FluidCursor GPU resources); paint-visible mount work moved to layout effects; render-phase ref writes replaced by the package hooks; per-frame state churn removed from pointer-tracked components; duplicate React keys eliminated in FileUpload, Composer and RippleButton.
  - **API**: `Button` and `IconButton` spell their handler `onClick`; the cameleon barrel exports `SkinReactContext`; `Drawer` and `Sheet` accept `ariaLabel`; `useAnchorPosition` accepts `recomputeKey`.
  - **React 18**: composed refs never return a cleanup, `inert` is applied through one mechanism on both majors, and a React 18 consumer job runs in CI.
  - **Package**: class-based dark mode works out of the box (`@custom-variant dark` + `color-scheme` in `tailwind.css`); the `"use client"` boundary is per module (pure utilities and constants are importable from Server Components); test rigs no longer ship declarations; `./package.json` is exported; the README documents ESM-only, TypeScript ≥ 5, dark mode and the Server Component boundary; the built artifact is smoke-tested and size-budgeted in `build`.
