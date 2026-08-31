# Pagination

A page-number control with Previous/Next, ellipsis collapsing for long runs,
and optional First/Last jump buttons.

## Components

- `Pagination` - The nav, its page buttons, and the ellipsis collapsing logic

## Usage

```svelte
<script>
	import { Pagination } from "fancy-ui-svelte";

	let page = $state(1);
</script>

<Pagination bind:page count={12} />
```

React to the change instead of (or alongside) binding:

```svelte
<script>
	import { Pagination } from "fancy-ui-svelte";

	function onPageChange(page) {
		fetchResults(page);
	}
</script>

<Pagination count={12} {onPageChange} />
```

With First/Last jump buttons and a wider sibling window:

```svelte
<Pagination bind:page count={50} showEdges siblingCount={2} />
```

## Props

| Prop            | Type                     | Default        | Description                                                               |
| --------------- | ------------------------ | -------------- | ------------------------------------------------------------------------- |
| `page`          | `number`                 | `1`            | Current page, 1-based. Bindable                                           |
| `count`         | `number`                 | —              | Total number of pages (required)                                          |
| `onPageChange`  | `(page: number) => void` | —              | Called with the new page whenever it changes, however the change happened |
| `siblingCount`  | `number`                 | `1`            | Pages shown on each side of the current page                              |
| `boundaryCount` | `number`                 | `1`            | Pages always shown at each end of the run                                 |
| `showEdges`     | `boolean`                | `false`        | Shows First/Last jump buttons alongside Previous/Next                     |
| `disabled`      | `boolean`                | `false`        | Disables every control in the nav                                         |
| `label`         | `string`                 | `"Pagination"` | Accessible name for the `<nav>` landmark                                  |
| `previousLabel` | `Snippet`                | —              | Overrides the Previous button's content                                   |
| `nextLabel`     | `Snippet`                | —              | Overrides the Next button's content                                       |
| `class`         | `string`                 | —              | Additional CSS classes                                                    |
| `ref`           | `HTMLElement \| null`    | `null`         | Bindable element reference, the `<nav>`                                   |
| `sound`         | `boolean`                | `false`        | Plays the `select` cue whenever the page actually changes                 |

## Sound

Set `sound` to play the `select` cue whenever any control actually moves the page, through the shared sound controller (see [`sound/README.md`](../sound/README.md)):

```svelte
<Pagination bind:page count={12} sound />
```

It is opt-in and silent by default: nothing plays unless both `sound` is set on `Pagination` **and** the user has turned sound on globally (through `SoundToggle` or `sound.enable()`). The cue lives inside `goTo()`, the single funnel every control — First, Previous, a page number, Next, Last — calls through, after both of its existing early-returns: `disabled` blocks the cue exactly like it blocks the page change, and landing on the already-current page (clicking the current pill, or Previous on page 1) plays nothing either, the same boundary check that already no-ops the change itself. The pop animation on the newly-current pill is armed off the page value alone and stays silent regardless of `sound` — a controlled `Pagination` whose `page` prop is changed from outside never plays a cue, since it never calls `goTo`.

## Theming

Pagination's surfaces read the app's shared semantic tokens — `bg-accent` /
`text-accent-foreground` for the current-page pill (the mockup's neutral
highlight, not the brand purple) and `text-muted-foreground` for everything
else. The one custom property it declares locally is the purple focus ring,
`--ft-nav-accent`, the same nav-family accent `Stepper` uses for its current
step — the two default to the same colour but are set independently:

```css
--ft-nav-accent: var(
	--ft-accent,
	light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
);
```

Retint just this component's focus ring:

```css
.my-pager {
	--ft-nav-accent: oklch(0.7 0.18 250);
}
```

Or retint every `--ft-nav-accent` consumer in a subtree at once by setting
the shared `--ft-accent` further up — `--ft-nav-accent` falls back to it, and
this component never redeclares `--ft-accent` itself, so a value set on an
ancestor keeps flowing through untouched.

One optional variable tunes the motion. It falls back to the library-wide
token, which falls back to a literal, so leaving it unset is the supported
default:

| Variable                       | Default                          | What it controls                   |
| ------------------------------ | -------------------------------- | ---------------------------------- |
| `--ft-pagination-pop-duration` | `var(--ft-duration-fast, 150ms)` | How long the active-page pop lasts |

## Motion

- When the page changes, the newly-current pill pops once from `scale(0.92)`
  to full size over 150 ms, so the eye can find where it landed instead of
  hunting for a colour change among a row of identical squares.
- The pop is **armed**: it never fires on first paint, only once the page has
  really moved. A page arriving already-current is not an event, and
  animating it would read as a glitch on load. Arming follows the page
  itself, so a controlled `Pagination` whose `page` prop changes from outside
  pops exactly like a clicked one.
- Only `transform` animates. The focus ring on those same buttons is painted
  with `box-shadow` and is deliberately left out of every animation.
- **Reduced motion.** The keyframe is declared inside
  `@media (prefers-reduced-motion: no-preference)`. Without that preference
  the pill simply changes place — the colour and `aria-current` change
  exactly as before.
- **Touch and coarse pointers.** The pop follows the page, never the pointer,
  so a coarse pointer needs no special handling.

## Implementation Notes

- The visible page sequence — which numbers show, and where the `…` markers
  land — is computed by `buildPageRange()` in the colocated
  `pagination-range.ts`, a pure function with no DOM dependency. It is
  exported from that file for the colocated test, but deliberately **not**
  re-exported from this folder's `index.ts` — it stays an internal
  implementation detail, not part of the public package surface.
- The sibling window around `page` has a fixed width
  (`2 * siblingCount + 1`) that shifts, rather than shrinks, when it would
  run off either edge. That's what pulls extra page numbers into view next
  to page 1 or the last page instead of the control's width jumping as the
  reader steps through it — see the comment at the top of
  `pagination-range.ts` for the mechanics.
- An ellipsis never stands in for a single hidden page — that page renders
  as a number instead, since the `…` costs the same one slot of width
  anyway and a number carries more information.
- Previous/Next/First/Last carry a real `disabled` attribute at the
  boundary, **and** their click handlers independently re-check the same
  boundary. A synthetic click (and `fireEvent.click` in tests) walks past a
  native `disabled` guard, so the attribute alone is not the real gate.
- The ellipsis renders as an `aria-hidden` `<span>`, never a `<button>` —
  it represents a range, not a control, and must not appear in the tab
  order.
- `{#each}` over the computed sequence keys ellipsis entries by their
  position (`ellipsis-${i}`), not by the literal string `"ellipsis"` —
  the sequence can contain two of them at once (one on each side of the
  current page), and a plain value key would collide.
- Each page button's accessible name is `"Go to page N"` (via `aria-label`
  and `title`), not the bare digit — the digit alone is what's visible.
