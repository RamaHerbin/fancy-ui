# Dialog

A modal panel with an optional trigger, a title/description pair, a body, and a free-form footer for the action row. Portals to `document.body`, traps and returns focus, dismisses on Escape and outside click, and locks the page's own scroll while open.

## Usage

```svelte
<script lang="ts">
	import { Dialog } from "fancy-ui-svelte";
	import { Button } from "fancy-ui-svelte";

	let open = $state(false);
	let email = $state("");
</script>

{#snippet trigger()}
	<Button>Invite member</Button>
{/snippet}

{#snippet footer()}
	<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
	<Button onclick={() => (open = false)}>Invite</Button>
{/snippet}

<Dialog
	bind:open
	{trigger}
	{footer}
	title="Invite a member"
	description="Send an email invite to join the workspace."
>
	<input type="email" bind:value={email} placeholder="email@example.com" />
</Dialog>
```

```svelte
<!-- No trigger: the caller owns the button and the open state entirely -->
<Button onclick={() => (open = true)}>Open</Button>
<Dialog open onOpenChange={(next) => (open = next)} title="Restart required" />
```

```svelte
<!-- Escape and outside click both disabled — the close button is still the way out -->
<Dialog bind:open dismissible={false} title="Finish setup" />
```

```svelte
<!-- Send focus somewhere other than the default (the close button) on open -->
<Dialog bind:open initialFocus={nameInput} title="Rename project">
	<input bind:this={nameInput} bind:value={name} />
</Dialog>
```

## Props

| Prop           | Type                      | Default | Description                                                                          |
| -------------- | ------------------------- | ------- | ------------------------------------------------------------------------------------ |
| `open`         | `boolean`                 | `false` | Whether the dialog is open. Bindable.                                                |
| `onOpenChange` | `(open: boolean) => void` | —       | Fires whenever `open` changes, from any trigger.                                     |
| `title`        | `string`                  | —       | The heading. Omitted entirely (not just visually) when not given.                    |
| `description`  | `string`                  | —       | The copy under the title. Same omission rule as `title`.                             |
| `dismissible`  | `boolean`                 | `true`  | Whether Escape and an outside click close the dialog. The close button always works. |
| `initialFocus` | `HTMLElement \| null`     | —       | Element to focus once the dialog opens. Defaults to the first focusable descendant.  |
| `children`     | `Snippet`                 | —       | The dialog's body.                                                                   |
| `footer`       | `Snippet`                 | —       | The action row under the body. Free-form.                                            |
| `trigger`      | `Snippet`                 | —       | Optional trigger; renders in place and opens the dialog on activation.               |
| `class`        | `string`                  | —       | Additional CSS classes for the panel.                                                |
| `ref`          | `HTMLDivElement \| null`  | `null`  | Bindable element reference to the panel.                                             |

## Accessibility

- `role="dialog"` with `aria-modal="true"`. `aria-labelledby`/`aria-describedby` point at the title/description elements — only when those props are given, never at an id with nothing behind it.
- Focus moves into the panel on open and returns to whatever had focus before it opened (typically the trigger) the instant you dismiss — not when the closing animation finishes. Tab is trapped inside the panel while it is open.
- The `✕` close button carries `aria-label="Close"` — the glyph itself is `aria-hidden`, so its accessible name never depends on a screen reader trying to pronounce "✕".
- Escape and an outside click both close the dialog by default; `dismissible={false}` turns both off together, for a step that should not be lost to a stray click or key. The close button is a third, always-available way out regardless of `dismissible` — it is a deliberate activation, not the accidental dismiss `dismissible` guards against.
- The page behind the dialog cannot be scrolled while it is open (see Implementation notes), and `aria-modal="true"` plus the focus trap is the standard signal to assistive tech that content behind the panel is inert.

## Theming

The panel reads `bg-popover`/`text-popover-foreground`/`border-border` — whatever those tokens resolve to in the consuming app. The backdrop is `bg-black/60`. The one non-standard value is the focus-ring accent, a scoped custom property with a `light-dark()` fallback, shared by name across every overlay in this family (Dialog, AlertDialog, and friends) so retinting `--ft-accent` anywhere up the tree moves all of their focus rings together:

```svelte
<div style="--ft-accent: oklch(0.6 0.2 290)">
	<Dialog ... />
</div>
```

## Motion

The panel and its backdrop arrive together over 300 ms on the shared arrival curve (`DURATIONS.base` and `JS_EASINGS.out` from the motion foundation) and leave together over 200 ms on the departure curve (`DURATIONS.exit`, `JS_EASINGS.in`). The panel scales as well as fades, growing from a `0.92` floor on the way in and collapsing only to `0.96` on the way out — leaving is a smaller gesture than arriving. The backdrop fades on opacity alone: a full-viewport fixed element has no business acquiring a compositing layer for a transform it never uses.

Both are JS transitions, not CSS animations, so there is no `--ft-*` variable to override here; the timing comes from the shared token ladder and moves with it.

The close is where the work is. `open` still flips the instant you dismiss — nothing a caller can observe waits for the fade — but the panel stays mounted while it plays, and four things happen at the dismiss instant rather than at the end of it:

- **Focus comes back immediately.** The trigger (or the fallback chain behind it) is refocused as the exit starts, not when it finishes. Waiting would leave a keyboard user on `<body>` for the whole 200 ms, because the closing panel is made inert the moment the exit begins.
- **A second Escape is a no-op, and reaches whatever is underneath.** The dismiss layer stops answering as soon as `open` is false, so it neither fires again nor swallows the key on its way to the surface below.
- **The page stays locked until the backdrop is gone.** The scroll lock releases at unmount, not at dismiss, so the page behind can never be scrolled while a backdrop is still on screen.
- **Reopening mid-exit reverses rather than stacking.** One bidirectional transition per surface, so a dialog reopened while it is fading continues from wherever it is instead of snapping to invisible first. Focus follows it back: a reversed exit is not a fresh mount, so the focus trap is re-armed as the entrance restarts — focus returns inside the panel, and the next dismiss returns it to the trigger exactly as the first one would have.

- **Reduced motion** — every transition collapses to a duration of zero, which makes the framework skip the animation entirely. The dialog appears and disappears instantly, and the close is fully synchronous again — exactly the behaviour this component had before it animated at all. Neither surface has a hidden resting state, so nothing is ever left invisible waiting for an animation that will not run.
- **Touch and coarse pointers** — unchanged; neither the entrance nor the exit is pointer-gated.

## Implementation notes

- **Trigger wiring.** `trigger` renders inside a `display: contents` wrapper that only listens for the click bubbling up from whatever it contains — it adds no interactive semantics of its own, so the trigger's own content (expected to be a real button) carries keyboard activation. The wrapper is passed to the dismiss action's `exclude` list, so a second click on the trigger while the dialog is already open does not read as an outside click and immediately close what was just opened.
- **Default focus target.** With no `initialFocus`, the shared focus-trap primitive focuses the first focusable descendant of the panel — which, in this component's own markup, is the close button (it renders before the body). That is a reasonable default for a dialog whose body has no obvious first field, but a form-centric dialog should pass `initialFocus` explicitly at the element it actually wants focused; see the `CustomInitialFocus` example.
- **Scroll lock.** Acquired when the panel mounts and released when it unmounts — an action on the panel element, not an effect keyed on `open`, which is what makes the release wait for the exit rather than firing the instant `open` flips. Reference-counted through the shared `lockScroll()`: a Popover opened from inside this dialog acquires its own lock on top of this one, and closing the popover alone does not unlock the page.
- **Shared surface.** `DialogSurface` (not exported) is the portal/backdrop/focus-trap/dismiss/scroll-lock plumbing both `Dialog` and `AlertDialog` render through. The two diverge enough in public API — a free-form footer versus a fixed confirm/cancel pair, `dismissible` versus a role-appropriate fixed default — that neither is built as a variant of the other; what they share is this plumbing alone.
- **Portal-before-focus-trap ordering.** `DialogSurface` portals the scrim and the panel independently — two sibling `use:portal` calls, not one wrapper div around both — and on the panel itself, `use:portal` is written before `use:focusTrap`/`use:dismissable` in source order. This is load-bearing, not stylistic: a child node's `use:` action can run before its parent's, so a version of this that wraps the panel in a shared `<div use:portal>` with `use:focusTrap` on a nested child lets the trap's initial `.focus()` call fire while the whole subtree is still detached from `document`. `.focus()` on a detached element is a silent no-op in every browser (jsdom included) — no error, no warning, focus simply never lands, and nothing about the trap action itself looks wrong. Two actions on the identical element are guaranteed to run in declaration order regardless of how Svelte schedules effects across a parent/child pair, which is what actually fixes it. `Dialog.test.ts`'s "moves focus inside the panel on open" test asserts `document.activeElement` is actually inside the panel — not merely that the trap action ran — specifically because that weaker assertion is exactly what would pass while this bug is present.
- **State reporting.** The panel carries `data-state="open"` while it is up and `data-state="closing"` for the length of the exit, for consumers that want to key their own styling off the phase. It is written imperatively from the transition's own start events rather than declared as a reactive attribute: a closing block's reactive attributes never reach the DOM, because the framework marks the branch inert before it plays the exit and then skips its effects. The closing panel is also `inert` for that whole window — the framework sets that itself for any element with a transition, and a closing modal must never be interactive again on the way out.
