# Skeleton

Placeholder bones for content that hasn't arrived yet — a block, one or more text
lines, or a circular avatar — with a phase-synced shimmer sweep, an opacity
pulse, or a static muted fill. Wrap real content with it to get a loading→content
swap with correct `aria-busy` semantics for free, or drop it in bare as a
standalone loading indicator.

## Usage

```svelte
<script>
	import { Skeleton } from "fancy-ui-svelte";
</script>

<!-- Standalone: Skeleton IS the loading indicator -->
<Skeleton variant="text" lines={3} class="w-64" />
<Skeleton variant="circle" class="size-10" />

<!-- Wrapping: real content swaps in once loading is false -->
<Skeleton loading={isLoading} variant="text" lines={2} class="w-48">
	<p>{message.text}</p>
</Skeleton>
```

A list of placeholder rows is **one** `<Skeleton variant="text" lines={n}>`, never
`n` separate `<Skeleton>`s — the multi-line shape already staggers the last
line's width and keeps the announcement to a single region.

## Props

| Prop        | Type                                | Default     | Description                                                                                    |
| ----------- | ----------------------------------- | ----------- | ---------------------------------------------------------------------------------------------- |
| `variant`   | `"rect" \| "text" \| "circle"`      | `"rect"`    | Bone shape                                                                                     |
| `lines`     | `number`                            | `1`         | Number of text lines; only read when `variant="text"`. Last line is 60% width when `lines > 1` |
| `animation` | `"shimmer" \| "pulse" \| "none"`    | `"shimmer"` | Sweep, opacity pulse, or a static muted bone                                                   |
| `loading`   | `boolean`                           | `true`      | Whether the placeholder is showing                                                             |
| `label`     | `string`                            | `"Loading"` | The one screen-reader announcement; pass `""` to silence it                                    |
| `children`  | `Snippet`                           | —           | Real content. Its presence switches Skeleton into wrapping mode                                |
| `class`     | `string`                            | —           | Merged with the base classes; also the sizing hook (no intrinsic size)                         |
| `ref`       | `HTMLDivElement \| null` (bindable) | `null`      | Bound reference to the root element; `null` when nothing renders                               |

`rect` and `text` bones have no intrinsic size — size them with `class`, e.g.
`class="h-4 w-40"`. `class` always lands on the root, which in wrapping mode
becomes the real content container once loading flips false — in that mode,
prefer `variant="text"` (bones bring their own `0.85em` height) and set width
only; a `rect`-variant wrapper needs its own `h-*` class or the bone falls
back to a `0.85em` minimum.

**Bones and content are rarely the same height, and the reveal is built around
that rather than against it.** When `loading` flips false the real content
takes its final place immediately and the outgoing bones become an
out-of-flow overlay that fades out over it (see [Motion](#motion)). So the
content is what sizes the container from the first frame — it never overshoots
to whichever layer is taller and then settles — and any difference between the
two heights shows as bones dissolving over content, not as a jump. Sizing the
wrapper for the bones alone still matters for the loading state itself, which
is the whole time before the swap.

## Theming

| CSS var                   | Fallback                                             | Meaning                                                                                |
| ------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `--ft-skeleton-base`      | `light-dark(oklch(0.93 0 0), oklch(0.32 0 0))`       | Bone rest colour                                                                       |
| `--ft-skeleton-highlight` | `color-mix(in oklab, currentColor 12%, transparent)` | Shimmer sweep tint                                                                     |
| `--ft-skeleton-radius`    | `0.375rem`                                           | `rect` corner radius only (`text` and `circle` override with their own literal in CSS) |
| `--ft-skeleton-duration`  | `1.6s`                                               | Shimmer/pulse cycle length                                                             |
| `--ft-skeleton-phase`     | `0s`                                                 | JS-set; negative `animation-delay` for page-wide sync                                  |

```css
.my-panel {
	--ft-skeleton-base: oklch(0.9 0.02 250);
	--ft-skeleton-highlight: oklch(0.98 0.02 250);
}
```

Each default is a `light-dark()` pair, because no single token clears 4.5:1
against both white and near-black. Which half applies is decided by
`color-scheme`, so **your theme must declare it**:

```css
:root {
	color-scheme: light;
}
.dark {
	color-scheme: dark;
}
```

## Motion

- **The reveal.** In wrapping mode the bones do not cut to the content, they
  fade out on top of it. The instant `loading` goes false the real content is
  rendered in its final, unwrapped position and the bones are re-parented into
  an `aria-hidden`, `pointer-events: none` overlay pinned over the root, which
  fades to nothing over `200ms` (`DURATIONS.exit`) on the `JS_EASINGS.in`
  curve — opacity only, no transform. The content is queryable and clickable
  from the first frame; nothing waits for the fade. Standalone mode (no
  `children`) has nothing to reveal — `loading={false}` renders nothing at all
  — so it gets no fade, by design.
- **Reduced motion.** The shimmer and pulse `@keyframes` live entirely inside
  `@media (prefers-reduced-motion: no-preference)`. With the preference set,
  every bone holds its flat rest colour — still a legible loading cue, just
  static. The reveal collapses to `duration: 0`, which makes Svelte skip
  `element.animate()` outright and remove the overlay in the same tick: an
  instant swap, exactly the behaviour this component had before the fade
  existed.
- **Touch and coarse pointers.** Nothing here is pointer-driven; the shimmer,
  the pulse and the reveal run identically regardless of input type.
- **Timing.** Shimmer and pulse both run a `1.6s` `linear` / `ease-in-out` loop.
  The shimmer is a `::after` overlay animated with `transform: translateX()`
  only (never `background-position`), so it stays compositor-only. `:dir(rtl)`
  plays the same sweep in reverse rather than mirroring the gradient.

## Accessibility

- **Standalone mode** (no `children`): the root itself is `role="status"
aria-live="polite"`, with every bone `aria-hidden="true"` and one
  `<span class="sr-only">{label}</span>` among them — the same shape as
  `PixelLoader`/`TypingIndicator`. `loading={false}` with nothing to show
  renders nothing at all.
- **Wrapping mode** (`children` present): the root carries `aria-busy` (mirroring
  `Button`'s own semantics) but is never itself `role="status"` — once loading
  flips false, the same node becomes the real content container, and a
  status role that outlived its announcement would be wrong. The one
  `role="status"` live region lives on an inner `sr-only` span that stays
  mounted for the component's lifetime and carries the label only while
  `loading` is true — emptied, not removed, once `children` takes over. It is
  kept mounted deliberately: a live region inserted already populated is
  announced unreliably, and `loading` false → true (a refetch on an
  already-rendered wrapper) is a normal flow here. Never two status nodes at
  once, and `label=""` still removes the span entirely. `aria-busy` is the
  primary, reliable machine-readable signal here; the inner status span is a
  best-effort announcement that some assistive tech may suppress while its
  own ancestor subtree is marked busy.
- **Nothing lingers into the fade except pixels.** `aria-busy`, `data-loading`
  and the `role="status"` span are all dropped in the same update `loading`
  flips in — a live region that outlived its own announcement would be exactly
  the bug the mode is shaped to avoid. What stays on screen for the length of
  the fade is the bones overlay alone, and it is `aria-hidden="true"` and
  `pointer-events: none`, so neither a screen reader nor a pointer can reach
  it.

## Implementation notes

- **Cleanup.** No listener, observer, or timer to tear down — the shimmer and
  pulse are fully CSS-gated, the reveal is a Svelte transition Svelte tears
  down itself, and the two effects (phase sync, and arming the reveal) hold no
  subscription.
- **The root is a containing block.** `.ft-skeleton` carries
  `position: relative`, so the bones overlay can pin itself to the root while
  it fades. `display: block` is unchanged. This only matters to a consumer who
  was relying on the skeleton root _not_ being the containing block for an
  absolutely positioned descendant of their own content.
- **SSR.** Server HTML renders the complete bones/label markup with JS off;
  `--ft-skeleton-phase` is added client-side only, after the mount effect reads
  `document.timeline` — its absence never blocks the shimmer, which just falls
  back to the CSS literal `0s` and loops unsynced.

## Browser support

Shimmer phase sync reads `document.timeline?.currentTime`, a Level 2 Web
Animations API surface that isn't universal (Safari support lagged
historically) and is absent under jsdom. Where it's missing, each Skeleton
instance still shimmers correctly — it just starts its own unsynced 1.6s loop
from 0% instead of lining up with every other instance on the page.
