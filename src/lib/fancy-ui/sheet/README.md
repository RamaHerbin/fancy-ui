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

| Prop           | Type                                     | Default   | Description                                                        |
| -------------- | ---------------------------------------- | --------- | ------------------------------------------------------------------ |
| `open`         | `boolean`                                | `false`   | Whether the sheet is open; bindable                                |
| `onOpenChange` | `(open: boolean) => void`                | —         | Called with the new value whenever the sheet opens or closes       |
| `side`         | `"left" \| "right" \| "top" \| "bottom"` | `"right"` | Edge of the viewport the panel slides in from                      |
| `title`        | `string`                                 | —         | Heading rendered in the header and wired to `aria-labelledby`      |
| `description`  | `string`                                 | —         | Supporting text under the title, wired to `aria-describedby`       |
| `dismissible`  | `boolean`                                | `true`    | Whether Escape, the scrim and the close button can close the sheet |
| `size`         | `"sm" \| "md" \| "lg"`                   | `"md"`    | Panel width (left/right sides) or height (top/bottom sides)        |
| `children`     | `Snippet`                                | —         | Panel body content                                                 |
| `footer`       | `Snippet`                                | —         | Content pinned below the body, e.g. actions                        |
| `class`        | `string`                                 | —         | Additional CSS classes merged onto the panel                       |
| `ref`          | `HTMLDivElement \| null`                 | `null`    | Bindable element reference to the panel                            |

## Theming

The panel and scrim use semantic tokens (`bg-popover`, `text-popover-foreground`,
`border-border`, `bg-black/60`) that already exist in the app's theme layer —
nothing to configure for the default look.

## Implementation Notes

- **Modal**: rendered through `_internals/portal.ts` into `document.body`,
  focus is trapped inside with `_internals/focus-trap.ts` (moves in on open,
  returns to whatever had focus right before opening — typically the trigger
  — once the panel unmounts), the page behind is scroll-locked with
  `_internals/scroll-lock.ts` (reference-counted; a second overlay opening
  on top does not fight this one for the lock), and Escape/outside click are
  handled by `_internals/dismissable.ts`, gated together by `dismissible`.
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
- **The entrance slide survives `prefers-reduced-motion: reduce`.** The
  panel's resting position (`translate(0, 0)`) is a plain, unconditional
  CSS rule; only the "slide in from off-screen" keyframe animation lives
  behind `@media (prefers-reduced-motion: no-preference)`. A panel that only
  becomes visible via a transition would vanish entirely with motion
  reduced — here it simply appears in place instead of sliding into place.
- **No exit animation**: closing removes the panel from the DOM immediately
  (an `{#if open}` block, not a Svelte `transition:`), keeping close
  synchronous and deterministic rather than waiting on an animation to
  finish before the rest of the app can react to `open` becoming `false`.
