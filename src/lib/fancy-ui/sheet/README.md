# Sheet

A modal panel that slides in from an edge of the viewport, for settings,
filters, or any focused task that doesn't need a full page.

## Components

- `Sheet` — a portalled, focus-trapped panel anchored to one of the four
  viewport edges

## Usage

```svelte
<script>
	import { Sheet } from "fancy-ui-svelte";
	import { Button } from "fancy-ui-svelte";

	let open = $state(false);
</script>

<Button onclick={() => (open = true)}>Open settings</Button>

<Sheet bind:open title="Settings" description="Update your workspace preferences.">
	<!-- body content -->
</Sheet>
```

Or handle the change yourself instead of binding:

```svelte
<script>
	import { Sheet } from "fancy-ui-svelte";

	let open = $state(false);

	function onOpenChange(next) {
		open = next;
	}
</script>

<Sheet {open} {onOpenChange} title="Settings">...</Sheet>
```

Pick an edge with `side`, and a width/height with `size`:

```svelte
<Sheet bind:open side="left" size="lg" title="Navigation">...</Sheet>
```

Pin actions to the bottom of the panel with `footer`:

```svelte
<Sheet bind:open title="Invite a teammate" {footer}>
	<!-- form fields -->
</Sheet>

{#snippet footer()}
	<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
	<Button onclick={submit}>Send invite</Button>
{/snippet}
```

## Props

| Prop           | Type                                     | Default   | Description                                                                |
| -------------- | ---------------------------------------- | --------- | -------------------------------------------------------------------------- |
| `open`         | `boolean`                                | `false`   | Whether the sheet is open; bindable                                        |
| `onOpenChange` | `(open: boolean) => void`                | —         | Called with the new value whenever the sheet opens or closes               |
| `side`         | `"left" \| "right" \| "top" \| "bottom"` | `"right"` | Edge of the viewport the panel slides in from                              |
| `title`        | `string`                                 | —         | Heading rendered in the header and wired to `aria-labelledby`              |
| `description`  | `string`                                 | —         | Supporting text under the title, wired to `aria-describedby`               |
| `dismissible`  | `boolean`                                | `true`    | Whether Escape, the scrim and the close button can close the sheet         |
| `size`         | `"sm" \| "md" \| "lg"`                   | `"md"`    | Panel width (left/right sides) or height (top/bottom sides)                |
| `children`     | `Snippet`                                | —         | Panel body content                                                         |
| `footer`       | `Snippet`                                | —         | Content pinned below the body, e.g. actions                                |
| `class`        | `string`                                 | —         | Additional CSS classes merged onto the panel                               |
| `ref`          | `HTMLDivElement \| null`                 | `null`    | Bindable element reference to the panel                                    |
| `sound`        | `boolean`                                | `false`   | Plays `close` when the sheet is dismissed, once the user has enabled sound |

## Theming

The panel and scrim use semantic tokens (`bg-popover`, `text-popover-foreground`,
`border-border`, `bg-black/60`) that already exist in the app's theme layer —
nothing to configure for the default look.

## Motion

The panel travels in from its own edge over 300 ms on the shared arrival curve (`DURATIONS.base` and `JS_EASINGS.out` from the motion foundation) and leaves the same way over 200 ms on the departure curve (`DURATIONS.exit`, `JS_EASINGS.in`). The scrim fades on opacity alone over the same two durations: a full-viewport fixed element has no business acquiring a compositing layer for a transform it never uses. Both run one clock, so they arrive and leave together.

The travel is a full 100% of the panel's own size in both directions. Anchored surfaces halve their exit — leaving is a smaller gesture than arriving — but a sheet that slid half-way off the viewport and then vanished reads worse than one that simply clears its edge, so this is the deliberate exception. There is no opacity term on the panel: a sheet leaves by travelling, and fading it as well reads as two gestures fighting.

Both are JS transitions, not CSS animations, so there is no `--ft-*` variable to override here; the timing comes from the shared token ladder and moves with it.

The close is where the work is. `open` still flips the instant you dismiss — nothing a caller can observe waits for the slide-out — but the panel stays mounted while it plays, and four things happen at the dismiss instant rather than at the end of it:

- **Focus comes back immediately.** The trigger (or the fallback chain behind it) is refocused as the exit starts, not when it finishes. Waiting would leave a keyboard user on `<body>` for the whole 200 ms, because the closing panel is made inert the moment the exit begins.
- **A second Escape is a no-op, and reaches whatever is underneath.** The dismiss layer stops answering as soon as `open` is false, so it neither fires again nor swallows the key on its way to the surface below.
- **The page stays locked until the sheet is gone.** The scroll lock is held by an action on the panel, and an action's teardown is delayed by the exit — so the page behind can never be scrolled while a scrim is still on screen.
- **Reopening mid-exit reverses rather than stacking.** One bidirectional transition per surface, so a sheet reopened while it is leaving continues from wherever it is instead of snapping off-screen first. Focus follows it back: a reversed exit is not a fresh mount, so the focus trap is re-armed as the entrance restarts.

- **Reduced motion** — every transition collapses to a duration of zero, which makes the framework skip the animation entirely. The sheet appears and disappears instantly, and the close is fully synchronous again — exactly the behaviour this component had before it animated out at all. Neither surface has a hidden resting state, so nothing is ever left off-screen waiting for an animation that will not run.
- **Touch and coarse pointers** — unchanged; neither the entrance nor the exit is pointer-gated, and the sheet has no drag gesture of its own.

## Sound

Set `sound` to play `close` whenever the sheet is dismissed — the close button, Escape or the scrim — through the shared sound controller (see [`sound/README.md`](../sound/README.md)):

```svelte
<Sheet bind:open sound title="Settings">...</Sheet>
```

It is opt-in and silent by default: nothing plays unless both `sound` is set on the sheet **and** the user has turned sound on globally. The cue is asymmetric by design — there is no `open` cue. The sheet has no internal open gesture of its own (opening is always programmatic, through `bind:open` or a caller-driven `open`/`onOpenChange` pair), and every dismiss path funnels through the same `close()`, whose own `if (!open) return` guard is what keeps a second Escape mid-exit — or any other redundant dismiss — silent rather than doubling the cue. `dismissible={false}` makes the sheet entirely silent, since none of its three dismiss paths can reach `close()` at all.

## Implementation Notes

- **Modal**: rendered through `_internals/portal.ts` into `document.body`,
  focus is trapped inside with `_internals/focus-trap.ts` (moves in on open,
  returns to whatever had focus right before opening — typically the trigger
  — at the instant you dismiss, not when the panel finishes leaving), the
  page behind is scroll-locked with `_internals/scroll-lock.ts`
  (reference-counted; a second overlay opening on top does not fight this
  one for the lock), and Escape/outside click are handled by
  `_internals/dismissable.ts`, gated together by `dismissible`.
- **Portal-before-focus-trap ordering**: the scrim and the panel are each
  portalled independently, rather than sharing one portal-wrapper `<div>`
  with the panel nested inside it. `use:` actions only run once their own
  node is fully built, but a _child's_ action can still fire before its
  _parent's_ — so a focus-trap action living on a node nested inside a
  separate portal wrapper would try to focus into a subtree the wrapper's
  own portal action hasn't relocated into `document.body` yet, and
  `.focus()` on a still-detached element is a silent no-op in every browser
  (jsdom included). Putting `use:portal` directly on the panel, ahead of
  `use:focusTrap` in source order, guarantees the panel is already attached
  to the document by the time focus-trap tries to focus into it.
- **`open` works all three ways**: bind it with `bind:open` for two-way
  sync, pass a plain `open` plus `onOpenChange` and let the callback drive
  your own state, or do both — `open` is declared `$bindable`, so a
  non-bound `open` still updates locally (closing via Escape, the scrim or
  the close button works either way) while `onOpenChange` fires regardless.
- **`aria-labelledby`/`aria-describedby`** only ever point at ids that
  exist: they're `undefined`, not a generated id with nothing behind it,
  whenever `title`/`description` are not passed.
- **`side` and `size` only ever combine into literal Tailwind classes** —
  `w-[24rem]`, `h-[18rem]`, etc. are written out in full in a lookup table
  in the component rather than assembled from interpolated strings at
  runtime, because Tailwind's v4 scanner reads source files as plain text:
  a class name has to appear literally somewhere in the file to be
  generated, even though it's picked at runtime through a variable.
- **The slide is a JS transition, not a keyframe animation.** The component
  carries no scoped `<style>` block at all any more: the four per-side
  `@keyframes`, the scrim fade and the `translate(0, 0)` resting rule they
  needed are all one small transition function in the script instead, which
  reads the requested side and emits a single percentage translate. That is
  what makes the same code able to run backwards on close, and what lets it
  collapse to zero duration under reduced motion without a media query.
- **`data-side` outlived the keyframes it used to select.** It is part of the
  component's semantics — consumers style and query against it — so it stays
  on the panel, and stays correct for the whole exit.
- **Closing is asynchronous, dismissing is not.** `open` flips, `onOpenChange`
  fires and the dismiss layer stands down all in the same tick as the
  dismissal; only the panel's removal from the DOM waits for the slide-out.
  A test that asserted synchronous removal needs to await it (`waitFor`); a
  test that asserts on `open`, on the callback or on focus does not.
