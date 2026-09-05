# Magnetic

A generic single-child wrapper that pulls its child toward the pointer while
the pointer sits inside an activation field larger than the child's own box,
and springs back to rest the moment the pointer leaves. Wrap a button, an
icon link, or a card — anything meant to feel alive under a cursor before it
is even touched.

Inspired by the "magnetic button" pattern seen across modern marketing sites.

## Usage

```svelte
<script lang="ts">
	import { Magnetic } from "$lib/fancy-ui/magnetic";
	import { Button } from "$lib/fancy-ui/button";
</script>

<Magnetic>
	<Button>Hover me</Button>
</Magnetic>
```

### A visible field halo

`Magnetic` renders a `::before` pseudo-element sized to the activation field
(transparent by default) as a structural hook — style it from your own CSS if
you want the field itself to be visible:

```css
:global(.ft-magnetic::before) {
	background: radial-gradient(circle, oklch(0.7 0.15 265 / 25%), transparent 70%);
}
```

The halo does not move with the pull — it marks the activation field, which
is anchored to the element's layout box, not the translated child.

The halo is `pointer-events: none` by construction and deliberately not
overridable: the component's own rule out-specifies a `:global()` override
for every declaration except `background`, which is left undeclared
precisely so you can set it. That is what makes a generous `radius` safe —
the enlarged field is arithmetic against the element's own bounding rect,
never a bigger hit-testable box, so it can never steal a click or a hover
from a neighbouring element.

### Scale

Magnetic is independent per instance — each one runs its own observer and
pointer listener, with no shared state. That is the right shape for a
handful of magnetic CTAs or icons, not for a large repeated grid (50+
items sharing one pointer signal); for that, reach for `Dock` instead, which
shares one pointer position across many children by design.

Placement matters as much as count: instances closer than `2 × radius` share
pointer positions, so two neighbours lean toward the same cursor at once.
One magnet per region of the page is the intended shape.

## Props

| Prop       | Type                     | Default  | Description                                                                                                                      |
| ---------- | ------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `strength` | `number`                 | `0.35`   | Pull multiplier applied to the pointer's offset from the child's center.                                                         |
| `radius`   | `number`                 | `40`     | Pixels the activation field extends beyond the element's own box, on every side.                                                 |
| `max`      | `number`                 | `24`     | Per-axis clamp (px) on the translated offset — a hard travel cap independent of geometry.                                        |
| `disabled` | `boolean`                | `false`  | Disables the pull entirely: no listeners attached, vars pinned at `0px`. Never touches the wrapped child's own `disabled` state. |
| `class`    | `string`                 | —        | Additional classes, merged onto the outer wrapper.                                                                               |
| `ref`      | `HTMLDivElement \| null` | `null`   | Bindable reference to the outer (static) wrapper element.                                                                        |
| `children` | `Snippet`                | required | The single wrapped element.                                                                                                      |

## Theming

| CSS var                               | Default | Notes                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--ft-magnetic-radius`                | `40px`  | Sizes the `::before` halo. Written inline only when `radius` differs from its default, so an instance left at the default never shadows a page-level override. Paint only. The activation geometry comes from the `radius` prop, so a page-level override changes what the halo shows without changing where the pull starts — set both, or leave both alone. |
| `--ft-magnetic-x` / `--ft-magnetic-y` | `0px`   | The current translation, written by pointer tracking. Not meant to be set by a consumer.                                                                                                                                                                                                                                                                      |

## Motion

- Only `transform` (`translate`) ever animates. `will-change: transform` is
  applied only while the field is active, not permanently.
- **Reduced motion**: gated in both directions. In CSS, the entire
  `transform`/`transition` rule lives inside
  `@media (prefers-reduced-motion: no-preference)` — outside it the element
  is static regardless of what the tracking vars hold. In JS,
  `prefers-reduced-motion: reduce` stops the observer and pointer listeners
  from ever being constructed in the first place — not a visual no-op, an
  actual no-op.
- **Touch and coarse pointers**: `@media (hover: none)` forces
  `transform: none` on touch-only devices. In JS, `pointerType === "touch"`
  events (and non-primary pointers, a cheap multi-touch guard) are ignored
  outright — this is deliberately not "degraded" to some other touch
  interaction; magnetic pull is a fine-pointer affordance and has no
  meaningful touch equivalent. A pen/stylus on a touch-primary device (where
  `(hover: none)` is true even while the pen itself can hover) satisfies
  neither guard: `data-state` still flips to `"active"` and `will-change` is
  still applied, on a node whose transform is pinned to `none` — nothing
  visibly moves, but the state attributes are a false positive for anything
  styling off them.
- **Timing**: while the pointer is in the field, a `150ms` `ease-in-out`
  smoothing. Because the target is rewritten every frame, this reads as
  slight inertia rather than a delay — a hand-held jitter does not become a
  control jitter. On release, `300ms ease-out`, slower than the follow, so
  the child settles back to rest instead of snapping off. The pull itself
  stops tracking once the pointer is `max / strength` px from the child's
  centre — about 69px with the defaults. For children wider than about
  140px that knee falls inside the box, so lower `strength` (roughly
  `max / (width / 2 + radius)`) to keep the pull proportional out to the
  field's edge.

## Accessibility

Magnetic renders no ARIA of its own and never _reacts_ to focus: `focusin`
triggers nothing, and Tab never starts, stops, or changes a pull — unlike
some of this family's other components. That is not the same claim as
"focus always finds it at rest": if a fine pointer happens to be resting
inside the field when focus arrives, the child is already displaced by that
pointer — the resting position is the pointer's, not the layout's (the focus
ring itself is never clipped; see below). The wrapped child keeps its own
focusability and accessible name
entirely; Magnetic is a transparent wrapper with no `role` or `tabindex` of
its own. The outer node never sets `overflow: hidden`, so a focus ring on the
wrapped child is never clipped.

`disabled` is a motion-only kill switch — it stops Magnetic's own pull, not
the wrapped child's interactivity. A `<button disabled>` inside a
non-disabled `<Magnetic>` still renders and behaves exactly as inert as it
would outside one.

## Implementation notes

- **Cleanup**: the pointer-tracking stack (`IntersectionObserver`, the
  `window` `pointermove` listener, the `document` `pointerleave` and `window`
  `blur` safety nets) is built and torn down together, inside one `$effect`
  gated on
  `!disabled && !reduced-motion`. Toggling either prop mid-interaction tears
  everything down through the same path an unmount would use, releasing the
  pull immediately. A pending animation frame is cancelled on teardown so a
  frame in flight never writes to a node after cleanup.
- Listening on `window` (not the element) is what makes "field bigger than
  the box" possible at all — an element-bound `pointerenter`/`pointerleave`
  can only ever produce ordinary hover. The `window` listener is attached
  only while an `IntersectionObserver` (its `rootMargin` inflated by
  `radius`, so a field that pokes into the viewport from just outside it
  still counts) reports the element on screen, and removed the instant it
  scrolls off — off-screen instances cost nothing.
- The `document` `pointerleave` listener exists because a pointer dragged off
  to OS chrome or another window never fires another `pointermove` inside the
  page; without it, the last computed pull would freeze on screen instead of
  releasing. A keyboard tab switch (Cmd/Alt+Tab, Ctrl+Tab) moves no pointer at
  all, so `pointerleave` alone misses it — a `window` `blur` listener covers
  that case, releasing the pull the instant the page loses focus.
- **SSR**: no `window`/`document`/`IntersectionObserver` access happens
  outside `$effect`. Server output is the outer/inner element pair with the
  tracking vars unset, falling back to their `0px` literal — visually
  identical to the disabled and reduced-motion states.
- `radius` is a static geometry knob, not a live-tunable one: changing it
  rebuilds the `IntersectionObserver` (its `rootMargin` is derived from
  `radius`), which tears down the window listener and releases the pull for
  one render until the new observer reports intersecting again. Fine for a
  value set once at mount; avoid animating or frequently reassigning it.
- Both the outer wrapper and `.ft-magnetic-inner` are `display: inline-block`,
  so an icon link sitting mid-sentence does not force a line break. `class`
  only reaches the outer node. To wrap a block-level child (e.g. a card)
  without it shrink-wrapping onto a text baseline, override both:
  `:global(.ft-magnetic, .ft-magnetic-inner) { display: block; width: 100% }`.
- `.ft-magnetic-inner` is `position: relative` (see the halo paint-order
  comment in the component's CSS) and gains a live `transform` under
  `no-preference` + `hover: hover`. A `position: absolute` descendant is
  anchored to it consistently in every media state; a `position: fixed`
  descendant is anchored to it instead of the viewport whenever
  `no-preference` + `hover: hover` applies — including at rest, since
  `translate(0px, 0px)` is still a transform, so this is constant in that
  media state, not intermittent. Render a fixed-position overlay (tooltip,
  dropdown) in a portal outside the wrapper rather than inside it.
