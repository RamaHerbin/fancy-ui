# fancy-ui-react

## 0.2.1

### Patch Changes

- bae13a4: FluidCursor: clicking no longer brightens the fluid forever when `fluidColor` or `fluidColors` is set. A click scaled the colour it was handed _in place_, and with a palette configured that colour is the cached palette entry itself — so every click multiplied the palette by ten again: the fifth click painted with a colour ten thousand times brighter, a few more overflowed to NaN and the fluid went blank. Random colours are fresh objects, which is why the default palette never showed it. The click now scales a copy, and the cached palette entries are frozen so a future in-place edit fails loudly instead of compounding.

  Two smaller click changes ride along. The click boost is now `min(10, 1.5 / colorIntensity)` instead of a flat ×10 on top of the already intensity-scaled colour, so raising `colorIntensity` — which the dither mode asks you to do — no longer raises the click's peak with it; the default intensity is byte-identical. And a click now _lifts_ each texel to its own profile rather than adding to it, so a burst of clicks on one spot paints the same disc once instead of summing towards white. Move splats are unchanged and still additive. No prop was added.

  Also on the WebGL path (Svelte): unmounting now deletes the engine's programs, shaders, textures, framebuffers and buffers and loses the context, instead of leaving a whole simulation's worth of GPU memory to the garbage collector and one more live context in the browser's budget on every re-key. And on all four engines, `mouseup` / `touchend` / `touchcancel` now mark the pointer released — `down` used to stay `true` for the life of the engine.

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
