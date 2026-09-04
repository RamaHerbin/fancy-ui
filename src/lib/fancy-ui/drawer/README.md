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

| Prop           | Type                      | Default | Description                                                                                              |
| -------------- | ------------------------- | ------- | -------------------------------------------------------------------------------------------------------- |
| `open`         | `boolean`                 | `false` | Whether the drawer is open; bindable                                                                     |
| `onOpenChange` | `(open: boolean) => void` | —       | Called with the new value whenever the drawer opens or closes                                            |
| `title`        | `string`                  | —       | Heading rendered in the header and wired to `aria-labelledby`                                            |
| `description`  | `string`                  | —       | Supporting text under the title, wired to `aria-describedby`                                             |
| `ariaLabel`    | `string`                  | —       | Accessible name for the dialog when no `title` is rendered; ignored when `title` is set                  |
| `dismissible`  | `boolean`                 | `true`  | Whether Escape, the scrim, the close button and the swipe gesture can close the drawer                   |
| `swipeToClose` | `boolean`                 | `true`  | Whether dragging the handle down past the threshold closes the drawer                                    |
| `children`     | `Snippet`                 | —       | Panel body content                                                                                       |
| `footer`       | `Snippet`                 | —       | Content pinned below the body, e.g. actions                                                              |
| `class`        | `string`                  | —       | Additional CSS classes merged onto the panel                                                             |
| `ref`          | `HTMLDivElement \| null`  | `null`  | Bindable element reference to the panel                                                                  |
| `sound`        | `boolean`                 | `false` | Plays `close` when the drawer is dismissed, including a committed swipe, once the user has enabled sound |

## Theming

The panel and scrim use semantic tokens (`bg-popover`, `text-popover-foreground`,
`border-border`, `bg-black/60`) that already exist in the app's theme layer —
nothing to configure for the default look.

## Motion

The panel rises from the bottom edge over 300 ms on the shared arrival curve (`DURATIONS.base` and `JS_EASINGS.out` from the motion foundation) and leaves the same way over 200 ms on the departure curve (`DURATIONS.exit`, `JS_EASINGS.in`). The scrim fades on opacity alone over the same two durations. Both run one clock, so they arrive and leave together.

The travel is a full 100% of the panel's own height in both directions. Anchored surfaces halve their exit — leaving is a smaller gesture than arriving — but a drawer that slid half-way down and then vanished reads worse than one that simply clears the edge, so this is the deliberate exception.

The swipe gesture and the exit are one motion, not two. A drag released past the dismiss threshold used to snap the panel back to rest and remove it in the same tick; now the release hands the exit its start point, and the slide-out carries on from exactly where your finger let go, down and off the screen. A drag released _below_ the threshold is a different interaction with a different curve and is unchanged: it springs back to rest over 200 ms and the drawer stays open.

All of this is JS transitions rather than CSS animations, except the spring-back, so there is no `--ft-*` variable to override; the timing comes from the shared token ladder and moves with it.

The close is where the rest of the work is. `open` still flips the instant you dismiss — nothing a caller can observe waits for the slide-out — but the panel stays mounted while it plays, and four things happen at the dismiss instant rather than at the end of it:

- **Focus comes back immediately.** The trigger (or the fallback chain behind it) is refocused as the exit starts, not when it finishes. Waiting would leave a keyboard user on `<body>` for the whole 200 ms, because the closing panel is made inert the moment the exit begins.
- **A second Escape is a no-op, and reaches whatever is underneath.** The dismiss layer stops answering as soon as `open` is false, so it neither fires again nor swallows the key on its way to the surface below.
- **The page stays locked until the drawer is gone.** The scroll lock is held by an action on the panel, and an action's teardown is delayed by the exit — so the page behind can never be scrolled while a scrim is still on screen.
- **Reopening mid-exit reverses rather than stacking.** One bidirectional transition per surface, so a drawer reopened while it is leaving continues from wherever it is instead of snapping off-screen first. Focus follows it back: a reversed exit is not a fresh mount, so the focus trap is re-armed as the entrance restarts.

- **Reduced motion** — every transition collapses to a duration of zero, which makes the framework skip the animation entirely. The drawer appears and disappears instantly, a past-threshold swipe removes it synchronously, and the spring-back snaps rather than eases. Neither surface has a hidden resting state, so nothing is ever left off-screen waiting for an animation that will not run.
- **Touch and coarse pointers** — the drag gesture is the whole point of this component and is pointer-driven rather than touch-only: it works with a mouse, a finger or a stylus alike, through pointer events plus `touch-action: none` on the handle row. `swipeToClose={false}` turns it off without taking away Escape, the scrim or the close button.

## Sound

Set `sound` to play `close` whenever the drawer is dismissed — the close button, Escape, the scrim, or a swipe released past the dismiss threshold — through the shared sound controller (see [`sound/README.md`](../sound/README.md)):

```svelte
<Drawer bind:open sound title="Filters">...</Drawer>
```

It is opt-in and silent by default: nothing plays unless both `sound` is set on the drawer **and** the user has turned sound on globally. Like `Sheet`, there is no `open` cue — opening is always programmatic, so the drawer only ever sounds its own dismissal. Every dismiss path funnels through the same `close()`, whose `if (!open) return` guard keeps a redundant dismiss (a second Escape mid-exit, a spring-back drag that falls short of the threshold) silent. A swipe released _below_ the threshold springs back and never calls `close()` at all — only a committed, past-threshold release plays the cue, the same as any other dismissal.

## Implementation Notes

- **Modal**: rendered through `_internals/portal.ts` into `document.body`,
  focus is trapped inside with `_internals/focus-trap.ts` (returned to the
  trigger at the instant you dismiss, not when the panel finishes leaving),
  the page behind is scroll-locked with `_internals/scroll-lock.ts`
  (reference-counted), and Escape/outside click are handled by
  `_internals/dismissable.ts`, gated together by `dismissible`.
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
  carries a transition, so it tracks the pointer with zero lag, and a drag
  released _past_ the threshold never carries it either: that one is handed
  to the exit instead. Under `prefers-reduced-motion: reduce` the class has
  no matching rule, so the same state change snaps back instantly.
- **A past-threshold release leaves the drag offset alone.** Zeroing it was
  invisible while removal was instant; with a slide-out it would snap the
  panel up to rest and then slide it down, which is two gestures where you
  made one. The offset is captured as the exit's start point instead, and
  reset on the way back in — so a drawer swiped shut reopens at rest, not
  where the last swipe left it.
- **The entrance and exit are a JS transition, not keyframes.** The
  per-direction slide, its resting position and the reduced-motion gate that
  used to wrap them are one small function in the script; only the
  spring-back is still CSS, because it belongs to the drag rather than to
  opening and closing.
- **Closing is asynchronous, dismissing is not.** `open` flips,
  `onOpenChange` fires and the dismiss layer stands down all in the same
  tick as the dismissal; only the panel's removal from the DOM waits for the
  slide-out. A test that asserted synchronous removal needs to await it
  (`waitFor`); a test that asserts on `open`, on the callback or on focus
  does not.
