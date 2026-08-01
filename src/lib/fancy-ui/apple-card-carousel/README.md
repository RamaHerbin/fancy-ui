# AppleCardCarousel

A horizontally scroll-snapping card carousel where tapping a card grows it from its on-screen position into a full-screen modal, then shrinks it back to that same spot on close — the geometry is measured, not animated between two fixed states.

## Usage

```svelte
<script lang="ts">
	import { AppleCardCarousel } from "fancy-ui-svelte";
	import type { AppleCardData } from "fancy-ui-svelte";

	const cards: AppleCardData[] = [
		{
			category: "Nature",
			title: "Misty Mountains",
			src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
			description: "A breathtaking view of misty mountains at dawn.",
		},
	];
</script>

<AppleCardCarousel {cards} />
```

## Props

### AppleCardCarousel

| Prop    | Type              | Default | Description                        |
| ------- | ----------------- | ------- | ---------------------------------- |
| `cards` | `AppleCardData[]` | —       | Cards to display (required)        |
| `class` | `string`          | `""`    | Additional CSS classes on the root |

`AppleCardData` shape: `{ category: string; title: string; src: string; description?: string; content?: Snippet }`. `content`, when provided, replaces `description` in the expanded view — pass a Svelte snippet for rich content (headings, lists, embedded components) instead of a plain paragraph.

`AppleCard` is also exported directly (`import { AppleCard } from "fancy-ui-svelte"`) for building a custom carousel shell around the individual expand/collapse card, but its own prop interface is internal to the component and not re-exported as a named type.

## Implementation notes

- Only one card can be expanded at a time: `expandedIndex` lives in `AppleCardCarousel` (not in each `AppleCard`) and is passed down along with `onExpand`/`onCollapse` callbacks, so a card whose `handleExpand()` fires while another is already open is a no-op (`if (expandedIndex !== -1) return`).
- The expand animation is a FLIP-style measure-then-morph: on click, `AppleCard` reads the collapsed card's `getBoundingClientRect()` and freezes it as the overlay's starting `top`/`left`/`width`/`height`, then flips a `fullyExpanded` flag (via a double `requestAnimationFrame` to guarantee a layout pass) that CSS-transitions those same properties to full-viewport.
- `prefers-reduced-motion` is detected once via `matchMedia` in `AppleCardCarousel` (with a `change` listener, so it updates if the user flips the OS setting mid-session) and passed down as `reducedMotion`. When true, `AppleCard` skips the double-rAF and the geometry transition duration drops to `0`.
- Focus management: opening a card saves `document.activeElement`, moves focus to the modal's close button, and traps `Tab`/`Shift+Tab` inside the dialog by walking its focusable elements; closing restores focus to whatever had it before.
- `Escape` closes the expanded card from anywhere inside the dialog (`onkeydown` on the dialog root).
- Collapse is deferred: the overlay stays mounted for `TRANSITION_MS` (400ms, or `0` under reduced motion) after `fullyExpanded` flips back to `false`, so the shrink transition can play before the DOM node is removed and `onCollapse` fires.
- The carousel track uses native scroll-snap (`snap-x snap-mandatory`) with the scrollbar hidden via `[scrollbar-width:none]` / `[&::-webkit-scrollbar]:hidden`, not a JS-driven scroller.
