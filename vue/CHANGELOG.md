# fancy-ui-vue

## 0.1.1

### Patch Changes

- 1739286: README rewritten on the same plan as the Svelte package: features, quick start, setup (Tailwind tokens, dark mode, server rendering, package shape, compatibility), agent docs, development, project structure and contributing, with the divergences list unchanged.

## 0.1.0

### Minor Changes

- 16fa701: Visual parity with fancy-ui-svelte for ten redesigned components:

  AnimatedTooltip: presence stack. Each avatar sits in a thin conic presence ring that lights with a soft halo on hover or focus while the active avatar lifts and its neighbours part to make room. The tooltip is now a theme-aware glass card with a pointer notch. New props: `accent`, `size`. The row and each avatar's exit clock are split across `AnimatedTooltip.vue` and `AnimatedTooltipAvatar.vue`, and the source's `:global(.dark) .at-root` rule becomes a plain `.dark .at-root` ancestor selector under the scoped compiler.

  Marquee: an eased conveyor with soft edge fades. With `pauseOnHover` the track brakes to a stop and pulls away just as smoothly on leave. ReviewCard becomes a nested hairline double frame with a soft top-edge highlight on hover. New props: `fade`, `speed`. The Web Animations upgrade rebuilds when `class` changes identity, so an inline array or object class should be hoisted to avoid churn; ReviewCard's dark-mode rule is written `.dark .review-card` under the scoped compiler.

  BentoGrid: framed tiles with a rising accent glow that rises on hover or focus while the content lifts and a card's CTA slides in, fading up in a stagger the first time the grid scrolls into view. New props: `reveal`, `accent` (on BentoGrid). A new internal `BentoFrame.vue` backs both tile types; its dark-theme and content-part selectors use `:deep()` in place of the source's `:global()`.

  ContainerScroll: a scroll-driven aperture replaces the tilted card, opening from a bright seam with no 3D rotation or perspective. New props: `accent`, `accentSecondary`. The DOM, class hooks and CSS custom properties are copied verbatim into `<style scoped>`, with the source's `:global(.dark)` wrappers written as plain ancestor selectors.

  Timeline: a light rail instead of a gradient bar, with a small glowing head riding the reading line and igniting each entry's dot as it arrives. New props: `accent`. The style block moves verbatim into `<style scoped>`, and the source's `:global(.dark) .tl-root` rule becomes a plain `.dark .tl-root` ancestor selector.

  SmoothCursor: multiplayer-style cursor with a trailing name pill on its own softer spring that dims when idle. New props: `label`, `color`, `rotate`, `idleFade`, `labelSpring`. The shared core (`smooth-cursor-core.ts`) is now byte-identical across all three packages; the custom cursor is the `#cursor` slot, and its hotspot is recomputed from the slot's presence on every render since slot presence is not reactive in Vue.

  BorderBeam: a single directional comet replaces the gradient square, with a white-hot head, a long feathered tail and a dim hairline that lights only within its reach. New defaults are a calm ice-to-lilac pair and a 9s lap; new props: `tail`, `glow`, `reverse`. The dark-theme rule and the `bb-travel`/`bb-ignite` keyframes stay in the scoped block, renamed consistently by the compiler.

  Dock: a lit glass shelf where a blurred pool of accent light follows the pointer and each icon casts a soft floor reflection. New props: `spotlight`, `reflection`, `ariaLabel`. A DockIcon or DockSeparator mounted outside a Dock now degrades to a frozen fallback context instead of throwing, and the source's `:global(.dark) .dock-*` rules become plain `.dark .dock-*` ancestor selectors.

  AnimatedBeam: a theme-aware glass fibre carries a light packet with a dispersing chromatic tail and an arrival bloom, replacing the SMIL gradient. New props: `pulses`, `tail`, `glow`, `seed`. The gradient and filter ids now read `beam-v-N` (`-glow`/`-bloom`) from `useFancyId()`, and the ResizeObserver re-arms from a `flush: 'post'` watcher since a parent's template ref is still null when a child's `onMounted` runs.

  Stepper: lit connectors — each rail fills with a single run of light when the step before it completes, the current bullet breathes a soft halo, and a completed check draws itself. No new props and no Vue-specific divergences beyond the package-wide rules.

- 3fdcc8c: First release of `fancy-ui-vue`: the Vue 3.5 counterpart of `fancy-ui-svelte`, at parity with all 145 components, the `sound` family and the cameleon skin engine on the `fancy-ui-vue/cameleon` subpath. Every component is a faithful transpose of the Svelte reference (own-props `<Name>Props`, `v-model:<name>` for each bindable, `defineExpose({ ref })`, snippets as slots, `<style scoped>` with the same class and keyframe names); every deliberate difference is listed in the package README. Ships `styles.css`, a `tailwind.css` `@source` entry, and typed declarations checked against the `vue@3.5.2` floor.

### Patch Changes

- e056d07: ImageTrailCursor: nine new trail variants. `scale` pops each image in with a bouncy scale and shrinks it away behind the cursor; `fall` springs it in, spins it and drops it out through the bottom edge; `gravity` throws it sideways with the pointer, lands it on the bottom edge and bounces it twice; `flame` flickers it in and lets it rise as it burns away, tilting harder the faster the pointer moves. Five reveals draw each picture from fragments that open and close in sequence: `venetian` (slats, top to bottom), `curtain` (strips from their centre line), `hexagon` (a honeycomb growing from the centre), `liquid` (swelling blobs) and `zoom-split` (quadrants flying out of the centre). `fall` and `gravity` measure the container's height, so give it a height and `overflow-hidden`.
- 16acc2f: Eleven components catch up with their redesigned Svelte source: `FlipCard` (physical flip with `trigger`, `flipped`, `onFlip`/`onflip`, `duration`, `glare`, `label`, and an inert hidden face), `Meteors` (seeded field in depth with `angle`, `speed`, `color`), `GlowBorder` (liquid-metal ring with `preset` and `strength`), `Compare` (a blade of light at the seam with `beamColors` and `label`), `NeonBorder` (two-colour tube with chasing beams), `Pagination` (the current-page pill slides between numbers), and the `RainbowButton`, `ShimmerButton`, `GradientButton`, `RippleButton` and `InteractiveHoverButton` hover and press effects.
