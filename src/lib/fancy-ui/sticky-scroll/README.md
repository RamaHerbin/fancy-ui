# StickyScroll

A two-column scroll narrative: a scrolling column of items on one side, a sticky panel on the other that swaps its content to match whichever item is centred in the viewport. On a narrow container the layout stacks to a single column with the panel becoming a bounded, top-sticky header that the items scroll underneath — see Implementation notes for how that switch actually happens.

This is the library's first fully generic component: `items`, and the `item`/`panel` snippets, are typed to whatever shape you hand it — no `StickyScrollItem` type to conform to.

## Usage

```svelte
<script lang="ts">
	import { StickyScroll } from "fancy-ui-svelte";

	interface Step {
		title: string;
		body: string;
		image: string;
	}

	const steps: Step[] = [
		{ title: "Compose", body: "Write the message.", image: "/compose.png" },
		{ title: "Review", body: "Check it over.", image: "/review.png" },
		{ title: "Send", body: "Off it goes.", image: "/send.png" },
	];
</script>

<StickyScroll items={steps}>
	{#snippet item(step, index, active)}
		<div class:opacity-40={!active}>
			<h3>{step.title}</h3>
			<p>{step.body}</p>
		</div>
	{/snippet}
	{#snippet panel(step)}
		<img src={step.image} alt="" class="h-full w-full object-cover" />
	{/snippet}
</StickyScroll>
```

## Props

| Prop          | Type                               | Default | Description                                                                                         |
| ------------- | ---------------------------------- | ------- | --------------------------------------------------------------------------------------------------- |
| `items`       | `T[]`                              | —       | Required. The items rendered down the scrolling column.                                             |
| `item`        | `Snippet<[T, number, boolean]>`    | —       | Required. Renders one row: `(item, index, active)`.                                                 |
| `panel`       | `Snippet<[T, number]>`             | —       | Required. Renders the sticky panel's content for the active item: `(item, index)`.                  |
| `activeIndex` | `number` (bindable)                | `0`     | The active item's index. Holds its last value when nothing intersects the centre line.              |
| `panelSide`   | `"start" \| "end"`                 | `"end"` | Which logical side the panel sits on. Flips physically under `dir="rtl"`.                           |
| `crossfade`   | `boolean`                          | `true`  | Whether the panel crossfades between items. Effective value is always `false` under reduced motion. |
| `panelClass`  | `string`                           | —       | Additional CSS classes for the sticky panel wrapper.                                                |
| `panelHidden` | `boolean`                          | `true`  | Whether the panel is `aria-hidden`. Set `false` when the panel holds content found nowhere else.    |
| `onChange`    | `(index: number, item: T) => void` | —       | Called only when the active index actually changes.                                                 |
| `class`       | `string`                           | —       | Additional CSS classes for the root.                                                                |
| `ref`         | `HTMLDivElement \| null`           | `null`  | Bindable reference to the root element.                                                             |

Any other standard `<div>` attribute passes through.

## Theming

| Variable                               | Default | Applies to                                             |
| -------------------------------------- | ------- | ------------------------------------------------------ |
| `--ft-stickyscroll-gap`                | `2rem`  | Gap between the two columns, and between stacked items |
| `--ft-stickyscroll-top`                | `10vh`  | Panel's `top` offset in the two-column layout          |
| `--ft-stickyscroll-panel-size`         | `80vh`  | Panel's max block size in the two-column layout        |
| `--ft-stickyscroll-panel-size-stacked` | `40svh` | Panel's max block size once the layout has stacked     |

Once the layout has stacked, the panel overlays the top of the scrolling items rather than sitting beside them — its content must be opaque. The library ships no background on the panel by default, so an `object-fit: cover` image (the Usage example) is fine as-is, but a text or transparent panel needs a background supplied via `panelClass`. Panel content taller than `--ft-stickyscroll-panel-size` (two-column) or `--ft-stickyscroll-panel-size-stacked` (stacked) is clipped — `overflow: hidden` on the panel, with no scrollbar and no keyboard route to the clipped part — so size the panel to its content or raise the cap rather than relying on it to scroll internally.

## Motion

- **Reduced motion**: the panel's crossfade collapses to Svelte's own synchronous `duration: 0` fast path — the new panel content simply replaces the old one, no animation runs.
- **Touch and coarse pointers**: nothing pointer-specific. Activation follows scroll position (via `IntersectionObserver`) and focus, both of which work identically by touch.
- **Timing**: panel crossfade is `300ms`, arriving on the family's arrival curve and leaving on its departure curve (the JS twins of `--ft-ease-out`/`--ft-ease-in`) — the same direction-aware `preset("fade")` every other component in the set uses. It is sampled in JS, not CSS, so it is not overridable via the `--ft-ease-*` custom properties.

## Accessibility

`panelHidden` (default `true`) marks the sticky panel `aria-hidden="true"` — it normally mirrors content already visible and readable in the active row, so it would otherwise be redundant to assistive tech. Set `panelHidden={false}` when the panel is the ONLY place its content appears (e.g. an image with no equivalent text in the row).

**With the default `panelHidden`, the `panel` snippet must not contain focusable elements** — a link, a button, a media control. `aria-hidden` hides content from assistive technology but does **not** remove it from the tab order, so a focusable element inside an `aria-hidden` container is a WCAG 4.1.2 failure (axe rule: `aria-hidden-focus`). The default is safe only for content that is purely a visual mirror of the active row; pass `panelHidden={false}` the moment the panel holds anything focusable.

Keyboard users activate a section the same way scrolling does: `focusin` on any focusable content inside a row activates that row, so tabbing through row content keeps the panel in sync without requiring the mouse wheel. There is no scroll hijacking anywhere in this component — native scroll behavior (`scroll-behavior`, momentum, anchor navigation) is never touched.

## Implementation notes

- **Section tracking reuses the shared `inView` action** — one instance per `<section>`, `once: false`, `threshold: 0`, `rootMargin: "-50% 0px -50% 0px"` (a zero-height band pinned to the viewport's vertical centre — the `-50%`s on both top and bottom collapse the effective root rect to nothing). Because sections are non-overlapping stacked blocks, at most one can straddle that band at a time under normal layout, so "the last section to report entering wins" is a correct, race-free way to derive `activeIndex` — no bespoke `IntersectionObserver` code was needed. On a browser with no `IntersectionObserver` at all, the shared action's fallback fires its `onChange` synchronously for every section at once, in index order — `activeIndex` lands on the last item rather than the first, since scroll position genuinely can't be known there. `IntersectionObserver` is Baseline-since-2019, so this only matters on very old browsers.
- **Exactly two children** sit directly under the root: an items-column wrapper and the panel. The root is one wrapping flex line (`display: flex; flex-wrap: wrap`) and both children carry `flex: 1 1 min(100%, 20rem)`. That single declaration is the whole responsive rule: the two share a line and grow to equal halves of it while `2 × (20rem + gap) − gap` fits, and each takes its own full-width line when it doesn't — no breakpoint, and the arithmetic uses the **real** gap, so a `--ft-stickyscroll-gap` override moves the stacking point with it.
- **`panelSide` is placed via CSS `order`**, not DOM reordering — the panel is always rendered after the items in source order, and `order` alone decides whether it displays first or second. Combined with the flex line's native RTL-aware inline flow, this makes `panelSide="start"`/`"end"` genuinely logical without a separate `:dir(rtl)` override.
- **The stacked layout is the wrap itself, never a `@container` rule on the root.** An element is styled by the query containers _above_ it, never by the `container-type` it declares on itself, so a `@container` rule selecting `.ft-stickyscroll` could not switch this element's own layout — it would resolve against an unrelated ancestor container, or match nothing at all. The wrap is what gives the panel actual sticky travel once stacked, too: a flex item's containing block is the whole flex container's content box, so `top: 0` has the full column to move in. (A collapsed single-column **grid** cannot do this — a grid item's containing block is its own grid area, auto-sized to the panel's own content, so `position: sticky` would compile and never visibly do anything.)
- **The `@container` query (`container-type: inline-size` on the root) only tunes descendants once stacked** — the panel's `order: -1`, `top: 0` and `--ft-stickyscroll-panel-size-stacked` cap, plus each item's `scroll-margin-block-start` so that focusing or anchoring into a row doesn't park it underneath the now-overlaying panel. `order: -1` places the panel on the first line visually; DOM order is untouched, so the screen-reader/tab sequence stays narrative-then-summary. The condition (`width < 42rem`) mirrors where the flex line actually wraps at the **default** gap — `2 × (20rem + 2rem) − 2rem`, not the gap-blind `40rem` "two 20rem tracks" reading might suggest. A `--ft-stickyscroll-gap` override moves the real wrap point but not this query — a container query condition can't read a custom property — so a large enough override can put the two out of sync by that same amount. On a browser without container query support the layout still stacks (the wrap is plain flexbox); only the stacked panel's sizing and placement keep their two-column values — a cosmetic difference, not a broken layout.
- **`activeIndex` is read but never clamped** — a caller who binds it and sets it out of range gets exactly that value back. Only the index actually used to render the panel is clamped internally, so an `items` list shrunk out from under a stale `activeIndex` degrades to showing the last valid item instead of crashing.
- **Cleanup**: each section's `inView` action instance disconnects its own observer on unmount, independent of the others.
- **SSR**: renders every section and the panel for `activeIndex={0}` (or the bound value) directly — nothing is scheduled and no `IntersectionObserver`/`window` access happens outside the action and `$effect`, both client-only.
