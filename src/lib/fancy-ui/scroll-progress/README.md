# ScrollProgress

A thin bar that fills as the reader scrolls — the whole document by default, or a specific element via `target`. On a browser that supports CSS scroll-driven animations it needs no JavaScript at all: the fill is a native `animation-timeline: scroll()` keyframe, painting correctly before hydration even finishes. Everywhere else it falls back to a throttled scroll listener.

## Usage

```svelte
<script>
	import { ScrollProgress } from "fancy-ui-svelte";
</script>

<ScrollProgress />
```

Above a specific region instead of the whole page:

```svelte
<script>
	import { ScrollProgress } from "fancy-ui-svelte";
	let article = $state<HTMLElement | null>(null);
</script>

<ScrollProgress target={article} position="inline" label="Reading progress" />
<article bind:this={article} class="overflow-y-auto" style="max-height: 60vh">…</article>
```

## Props

| Prop       | Type                            | Default | Description                                                                                                                                                                                                                                                                                                                                        |
| ---------- | ------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `target`   | `HTMLElement \| null`           | `null`  | An element to track instead of the document. Forces JS mode — reactively, so an element that only becomes available after mount (`bind:this`, an `{#if}`-gated scroller, async content) is picked up correctly, not stuck tracking the document (see Implementation notes).                                                                        |
| `position` | `"top" \| "bottom" \| "inline"` | `"top"` | `top`/`bottom` pin the bar to that viewport edge; `inline` renders in flow.                                                                                                                                                                                                                                                                        |
| `label`    | `string`                        | —       | Announces the bar as `role="progressbar"` with this name. Forces JS mode. This is the only way to name the bar — a plain `aria-label` passed through the rest props is applied _before_ this prop's own `aria-label` and so is silently removed, leaving the bar `aria-hidden="true"` if `label` itself isn't also set (see Implementation notes). |
| `class`    | `string`                        | —       | Additional CSS classes.                                                                                                                                                                                                                                                                                                                            |
| `ref`      | `HTMLDivElement \| null`        | `null`  | Bindable reference to the root element.                                                                                                                                                                                                                                                                                                            |

Any other standard `<div>` attribute (`data-*`, `id`, …) passes through.

## Theming

| Variable                        | Default        | Applies to                                  |
| ------------------------------- | -------------- | ------------------------------------------- |
| `--ft-scrollprogress-thickness` | `3px`          | Bar height                                  |
| `--ft-scrollprogress-color`     | `currentColor` | Fill color                                  |
| `--ft-scrollprogress-track`     | `transparent`  | Background behind the fill                  |
| `--ft-scrollprogress-z`         | `50`           | `z-index` when `position` is `top`/`bottom` |
| `--ft-scrollprogress-origin`    | `left`         | Fill's transform-origin — flips under RTL   |
| `--ft-scrollprogress-value`     | `0`            | 0–1 fill fraction — written by JS mode only |

## Motion

- **Reduced motion**: deliberately **not** gated behind `prefers-reduced-motion`. The bar's `scaleX` is a 1:1, reader-driven mapping of scroll position to fill width — nothing animates while the reader is stationary, there is no loop and no autoplay. The house policy targets motion that runs on its own or exaggerates the input driving it; a scroll-progress fill is neither, and it is a genuinely useful, low-vestibular-load position indicator for exactly the readers who benefit most from a document-position landmark. Turning it off would remove information, not spare anyone an animation.
- **Touch and coarse pointers**: nothing pointer-specific — the bar tracks whatever scrolls, by touch or otherwise.
- **Timing**: CSS mode has no discrete duration (it tracks `scroll()` directly, 1:1). JS mode recomputes at most once per animation frame via a trailing rAF throttle.

## Accessibility

No `label` (the default): the whole bar is `aria-hidden="true"` — decorative chrome, the same choice most reading-progress bars make. With `label` set: `role="progressbar"`, `aria-label={label}`, `aria-valuemin="0"`, `aria-valuemax="100"`, and a live `aria-valuenow` (whole percent) that updates on the same throttled tick as the visual fill, never per raw scroll event.

## Implementation notes

- **Two modes, one markup.** Both modes render the identical `.ft-scrollprogress` / `.ft-scrollprogress-bar` structure — only the driving mechanism differs, gated by a `data-mode` attribute. `data-mode` is absent from server-rendered HTML and only ever gets ADDED client-side (never changed out from under something the server already committed to), so there is no hydration mismatch to worry about — and the CSS keyframe rule matches an absent `data-mode` the same way it matches `data-mode="css"`, so a `@supports`-capable browser is already painting the document's fill before `onMount` has run. A bar with a `target` shows that document fill for those first frames too, before switching over to its target's own progress once `onMount` resolves.
- **The capability is probed once; the mode follows `target`/`label`.** `CSS.supports("animation-timeline", "scroll()")` is checked exactly once, inside `onMount` — browser support for a CSS feature isn't the kind of thing that changes mid-session. But the resulting `mode` is derived live from that capability together with the current `target`/`label`, not latched at the same moment: a bar that starts in CSS mode (no `target`, no `label`, at mount) and is later handed a `target` — a `bind:this` element that resolves after this component, an `{#if}`-gated scroller, content that arrives async — flips to JS mode the instant that happens, rather than staying stuck tracking the document's scroll.
- **`target` always pays for JS mode**, even on a browser that supports scroll-timelines — a named CSS scroll-timeline can only be threaded through an ancestor scroller, and an arbitrary `target` isn't guaranteed to be one. This is a deliberate, narrow limitation, not an oversight.
- **Never animates `width`** — only `transform: scaleX(...)`, so the fill is compositor-only work even during a scroll-driven repaint storm.
- **JS mode recomputes on scroll and on viewport resize only.** It does not observe content-size changes, so a document (or `target`) whose scrollable height changes after load — late images, an expanding accordion, a font swap — reports a stale fraction until the next scroll event repairs it. `resize` on an HTMLElement `target` in particular never fires at all (elements don't dispatch `resize`); it's attached for the `window` case and is inert, not harmful, when a `target` is set.
- **`label` is the only way to name the bar.** It is applied via `aria-label={label}` written _after_ `{...restProps}` in the template (contract-mandated ordering, so callers can't clobber the state attributes) — which means a plain `aria-label` passed through the rest props is silently removed rather than merged.
- **Cleanup**: JS mode's `scroll`/`resize` listeners and the pending rAF frame are torn down in the `$effect`'s cleanup on unmount or on any change to `target`/`mode`.
- **SSR**: renders the complete bar markup with no fill (`--ft-scrollprogress-value` unset, resolving to its `0` fallback) — nothing is scheduled and no `window`/`document` access happens outside `onMount`/`$effect`, both of which are client-only.

## Browser support

CSS mode requires `animation-timeline: scroll()` (`@supports`-gated, checked via `CSS.supports`). Every other browser — including everywhere `CSS.supports` itself is unavailable — gets the identical visible bar, filled by the JS fallback instead. Nothing is ever left unfilled or broken; only the mechanism changes.
