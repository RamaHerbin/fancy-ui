# Drawer

A modal panel that rises from the bottom of the viewport with a grab handle,
draggable shut with a downward swipe — for filters, quick actions, or any
touch-first task.

## Components

- `Drawer` — a portalled, focus-trapped bottom sheet with an optional
  pointer-driven swipe-to-close gesture

## Usage

```svelte
<script>
	import { Drawer } from "fancy-ui-svelte";
	import { Button } from "fancy-ui-svelte";

	let open = $state(false);
</script>

<Button onclick={() => (open = true)}>Open filters</Button>

<Drawer bind:open title="Filters" description="Drag down to close.">
	<!-- body content -->
</Drawer>
```

Or handle the change yourself instead of binding:

```svelte
<script>
	import { Drawer } from "fancy-ui-svelte";

	let open = $state(false);

	function onOpenChange(next) {
		open = next;
	}
</script>

<Drawer {open} {onOpenChange} title="Filters">...</Drawer>
```

Turn off the swipe gesture and keep Escape/the scrim/the close button as the
only ways out:

```svelte
<Drawer bind:open swipeToClose={false} title="Filters">...</Drawer>
```

Pin actions to the bottom of the panel with `footer`:

```svelte
<Drawer bind:open title="Filters" {footer}>
	<!-- filter controls -->
</Drawer>

{#snippet footer()}
	<Button variant="outline" onclick={() => (open = false)}>Reset</Button>
	<Button onclick={apply}>Apply</Button>
{/snippet}
```

## Props

| Prop           | Type                      | Default | Description                                                                            |
| -------------- | ------------------------- | ------- | -------------------------------------------------------------------------------------- |
| `open`         | `boolean`                 | `false` | Whether the drawer is open; bindable                                                   |
| `onOpenChange` | `(open: boolean) => void` | —       | Called with the new value whenever the drawer opens or closes                          |
| `title`        | `string`                  | —       | Heading rendered in the header and wired to `aria-labelledby`                          |
| `description`  | `string`                  | —       | Supporting text under the title, wired to `aria-describedby`                           |
| `dismissible`  | `boolean`                 | `true`  | Whether Escape, the scrim, the close button and the swipe gesture can close the drawer |
| `swipeToClose` | `boolean`                 | `true`  | Whether dragging the handle down past the threshold closes the drawer                  |
| `children`     | `Snippet`                 | —       | Panel body content                                                                     |
| `footer`       | `Snippet`                 | —       | Content pinned below the body, e.g. actions                                            |
| `class`        | `string`                  | —       | Additional CSS classes merged onto the panel                                           |
| `ref`          | `HTMLDivElement \| null`  | `null`  | Bindable element reference to the panel                                                |

## Theming

The panel and scrim use semantic tokens (`bg-popover`, `text-popover-foreground`,
`border-border`, `bg-black/60`) that already exist in the app's theme layer —
nothing to configure for the default look.

## Implementation Notes

- **Modal**: rendered through `_internals/portal.ts` into `document.body`,
  focus is trapped inside with `_internals/focus-trap.ts`, the page behind
  is scroll-locked with `_internals/scroll-lock.ts` (reference-counted), and
  Escape/outside click are handled by `_internals/dismissable.ts`, gated
  together by `dismissible`.
- **Portal-before-focus-trap ordering**: the scrim and the panel are each
  portalled independently rather than sharing one portal-wrapper `<div>`
  with the panel nested inside it — see the Sheet README for the full
  explanation. In short: `.focus()` is a silent no-op on a still-detached
  element, so `use:portal` has to run on the same node as `use:focusTrap`,
  ahead of it in source order, not on a separate ancestor.
- **`dismissible` gates the swipe gesture too**: `swipeToClose` only arms
  dragging when `dismissible` is also true — a drawer marked
  non-dismissible can't be swiped away either, matching the same "can the
  user close this without the caller setting `open` itself" question that
  Escape, the scrim and the close button already answer together. With
  `swipeToClose={false}` (but `dismissible` still true), the drawer stays
  fully usable through Escape, the scrim and the close button; the gesture
  is never the only way out.
- **The drag surface is the handle + header row only** — not the body or
  footer, so scrollable content and interactive footer controls keep their
  own pointer behavior. It carries `touch-action: none`, because without it
  a touch drag is first interpreted by the browser as a page-scroll/pan
  gesture: that both withholds the continuous `pointermove` stream the
  handler needs and fights the drawer's own transform with the browser's
  scroll offset. Pointer capture (`setPointerCapture`, called on
  `pointerdown`) is what keeps the drag tracking even if the pointer strays
  outside the handle row mid-swipe.
- **Dragging only ever sets a `transform`**, never `height`/`top` — the
  panel's layout box never changes size during a drag, only its paint
  position, which is what keeps the gesture smooth.
- **Below the dismiss threshold (a fixed 96px, not a percentage of the
  panel's own height — the rendered height depends on content, so a
  percentage would make the same physical drag distance close the drawer
  sometimes and not others), the drag springs back to the resting position**
  rather than sticking wherever the pointer let go. The spring-back
  transition on `transform` is scoped to the brief window right after
  release (a `--releasing` state class) — live dragging itself never
  carries a transition, so it tracks the pointer with zero lag. Under
  `prefers-reduced-motion: reduce` that class has no matching rule, so the
  same state change snaps back instantly instead of easing.
- **The entrance slide survives `prefers-reduced-motion: reduce`.** The
  panel's resting position (`translateY(0)`) is a plain, unconditional CSS
  rule; only the "slide up from off-screen" keyframe animation lives behind
  `@media (prefers-reduced-motion: no-preference)`.
- **No exit animation**: closing removes the panel from the DOM immediately
  (an `{#if open}` block, not a Svelte `transition:`), keeping close
  synchronous and deterministic.
