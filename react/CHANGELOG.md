# fancy-ui-react

## 0.4.0

### Minor Changes

- 16fa701: Visual parity with fancy-ui-svelte for ten redesigned components:

  AnimatedTooltip: presence stack. Each avatar sits in a thin conic presence ring (accent pair plus a white-hot arc) that lights with a soft halo on hover or focus while the active avatar lifts and its neighbours part to make room. The tooltip is now a theme-aware glass card with a pointer notch that rises on a light overshoot curve and keeps the pointer lean, with one line of light sweeping under the name on open. New props: `accent`, `size`. The colocated `animated-tooltip.css` anchors every rule under `.at-root`, and the lean transform and the exit-only sink transition are written imperatively from refs rather than through render state.

  Marquee: an eased conveyor with soft edge fades. With `pauseOnHover` the track brakes to a stop over about half a second and pulls away just as smoothly on leave. Items dissolve into both edges through an eased alpha mask. ReviewCard becomes a nested hairline double frame with a soft top-edge highlight on hover. New props: `fade`, `speed`. The per-instance conveyor state lives in one lazily created ref object, and ReviewCard ships its own colocated `review-card.css` so it is styled even without a Marquee.

  BentoGrid: framed tiles with a rising accent glow. Every BentoGridItem and BentoGridCard is now a nested double frame, and on hover or keyboard focus a blurred accent glow rises from the bottom of the panel while the content lifts and a card's CTA slides in. Tiles fade up in a stagger the first time the grid scrolls into view. New props: `reveal`, `accent` (on BentoGrid). A new internal `BentoFrame` component (not exported) backs both tile types, with its own colocated `bento-frame.css`.

  ContainerScroll: a scroll-driven aperture replaces the tilted card, opening from a bright seam with no 3D rotation or perspective. New props: `accent`, `accentSecondary`. The first measurement runs in an isomorphic layout effect so a card already in view never paints one shut frame.

  Timeline: a light rail instead of a gradient bar, with a small glowing head riding the reading line and igniting each entry's dot as it arrives. New props: `accent`. The head position is written imperatively to `--tl-progress` each frame rather than through state, and row content is memoised so lighting a dot does not re-invoke the `content` render prop for the whole list.

  SmoothCursor: multiplayer-style cursor with a trailing name pill on its own softer spring that dims when idle. New props: `label`, `color`, `rotate`, `idleFade`, `labelSpring`. The wrapper now drives the shared framework-free engine (`smooth-cursor-core.ts`, byte-identical to the Svelte core) instead of re-implementing the spring loop inline.

  BorderBeam: a single directional comet replaces the gradient square, with a white-hot head, a long feathered tail and a dim hairline that lights only within its reach. New defaults are a calm ice-to-lilac pair and a 9s lap; new props: `tail`, `glow`, `reverse`. The compiler-scoped rules are anchored under the existing `.border-beam` root class in colocated CSS.

  Dock: a lit glass shelf where a blurred pool of accent light follows the pointer and each icon casts a soft floor reflection. New props: `spotlight`, `reflection`, `ariaLabel`. The decorative CSS is colocated (`dock.css`, `dock-icon.css`) and anchored under the source's own root classes, and the pointer/spot state is written as one state object per frame.

  AnimatedBeam: a theme-aware glass fibre carries a light packet with a dispersing chromatic tail and an arrival bloom, replacing the SMIL gradient. New props: `pulses`, `tail`, `glow`, `seed`. The svg root gains a port-added `animated-beam` anchor class for its colocated `animated-beam.css`, since the source's styles now rely on compiler scoping.

  Stepper: lit connectors — each rail fills with a single run of light when the step before it completes, the current bullet breathes a soft halo, and a completed check draws itself. No new props. `step.css` ships the redesigned rail, halo and glyph-draw styles verbatim, and reduced motion is read through `useReducedMotion()` with an `asked` mount flag so neither the server render nor hydration ever carries the animate class.

- e056d07: ImageTrailCursor: nine new trail variants. `scale` pops each image in with a bouncy scale and shrinks it away behind the cursor; `fall` springs it in, spins it and drops it out through the bottom edge; `gravity` throws it sideways with the pointer, lands it on the bottom edge and bounces it twice; `flame` flickers it in and lets it rise as it burns away, tilting harder the faster the pointer moves. Five reveals draw each picture from fragments that open and close in sequence: `venetian` (slats, top to bottom), `curtain` (strips from their centre line), `hexagon` (a honeycomb growing from the centre), `liquid` (swelling blobs) and `zoom-split` (quadrants flying out of the centre). `fall` and `gravity` measure the container's height, so give it a height and `overflow-hidden`.
- 16acc2f: Eleven components catch up with their redesigned Svelte source: `FlipCard` (physical flip with `trigger`, `flipped`, `onFlip`/`onflip`, `duration`, `glare`, `label`, and an inert hidden face), `Meteors` (seeded field in depth with `angle`, `speed`, `color`), `GlowBorder` (liquid-metal ring with `preset` and `strength`), `Compare` (a blade of light at the seam with `beamColors` and `label`), `NeonBorder` (two-colour tube with chasing beams), `Pagination` (the current-page pill slides between numbers), and the `RainbowButton`, `ShimmerButton`, `GradientButton`, `RippleButton` and `InteractiveHoverButton` hover and press effects.

### Patch Changes

- 73d429c: The shared `mosaic-glow` core module now also carries the engine section extracted on the Svelte side (kept byte-identical); the React wrapper does not use it yet. No API change.
- 319e317: Shared cores re-aligned byte-for-byte with the Svelte reference: WebGPU typings now come from `@webgpu/types` instead of local copies, dev-only diagnostics are gone from the shared engines, and `ImageTrailCursor` keeps its animation loop running with an empty image pool (matching Svelte; no visible effect). No API change.
- 3fdcc8c: `ImageTrailCursor` with no images no longer starts an idle animation-frame loop on the first pointer move (shared core aligned with the Svelte package).

## 0.3.0

### Minor Changes

- 80399ef: Add DatamoshTransition, the page-transition overlay already in `fancy-ui-svelte`: a fixed grid of columns fills with flat blocks of saturated colour that fall, snap open through the middle and squeeze shut; `cover()` drops the columns over the page and `reveal()` lets them fall away. Variants (`variant`, `sweep`, palette presets through `colors`) and the picture `source` mode come with it. The methods travel through the forwarded ref (`DatamoshTransitionHandle`: `cover`, `reveal`, `play`, `element`), and the Svelte `bind:phase` becomes `onPhaseChange`.

### Patch Changes

- 9b63cbc: Button: the press bites. Holding the button still scales it to 0.97 over 150 ms, but the down-stroke now runs on the arrival curve instead of the reversible-state one, so the scale lands in the first frames; the release keeps the softer curve and settles. The React button gains the press it never had, along with the colour channel the Svelte source moved into CSS, so the two now behave the same on click.

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
