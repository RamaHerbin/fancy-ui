---
"fancy-ui-react": minor
---

Visual parity with fancy-ui-svelte for ten redesigned components:

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
