# AlertDialog

A confirmation dialog for consequential, hard-to-undo actions — deleting a project, signing out of every device, anything a stray click should not be able to trigger. Same modal plumbing as `Dialog` (portal, focus trap, scroll lock), but a fixed `role="alertdialog"`, a warning icon, and a `confirmLabel`/`cancelLabel`/`onConfirm`/`onCancel` API in place of a free-form footer.

## Usage

```svelte
<script lang="ts">
	import { AlertDialog } from "fancy-ui-svelte";
	import { Button } from "fancy-ui-svelte";
</script>

{#snippet trigger()}
	<Button variant="destructive">Delete project</Button>
{/snippet}

<AlertDialog
	{trigger}
	title="Delete this project?"
	description="This action is irreversible. All data will be lost."
	confirmLabel="Delete"
	onConfirm={() => deleteProject()}
/>
```

```svelte
<!-- Non-bound open + onOpenChange — for a confirmation triggered by something
     other than AlertDialog's own trigger, e.g. a toolbar action -->
<AlertDialog
	open={isOpen}
	onOpenChange={(next) => (isOpen = next)}
	title="Remove member?"
	confirmLabel="Remove"
	onConfirm={removeMember}
/>
```

## Props

| Prop           | Type                      | Default     | Description                                                                 |
| -------------- | ------------------------- | ----------- | --------------------------------------------------------------------------- |
| `open`         | `boolean`                 | `false`     | Whether the alert dialog is open. Bindable.                                 |
| `onOpenChange` | `(open: boolean) => void` | —           | Fires whenever `open` changes — Confirm, Cancel, or Escape.                 |
| `title`        | `string`                  | —           | The heading. Omitted entirely (not just visually) when not given.           |
| `description`  | `string`                  | —           | The warning copy under the title. Same omission rule as `title`.            |
| `confirmLabel` | `string`                  | `"Confirm"` | Label of the destructive action.                                            |
| `cancelLabel`  | `string`                  | `"Cancel"`  | Label of the safe action.                                                   |
| `onConfirm`    | `() => void`              | —           | Called when the destructive action is activated, before the surface closes. |
| `onCancel`     | `() => void`              | —           | Called when the safe action is activated, and also when Escape closes it.   |
| `initialFocus` | `HTMLElement \| null`     | —           | Element to focus once the surface opens. Defaults to the Cancel button.     |
| `trigger`      | `Snippet`                 | —           | Optional trigger; renders in place and opens the surface on activation.     |
| `class`        | `string`                  | —           | Additional CSS classes for the panel.                                       |
| `ref`          | `HTMLDivElement \| null`  | `null`      | Bindable element reference to the panel.                                    |

## The dismiss decision, and why

A destructive confirmation the user can dismiss by missing is not a confirmation. This component makes two different calls about how it can be dismissed, and both are fixed — there is no prop that changes either:

- **Outside click never dismisses.** Always `false`, unconditionally. A click that lands outside the panel is exactly the kind of accidental input a destructive prompt exists to filter out — a wide miss, a click meant for something behind the dialog before it rendered, a stray tap. Letting that silently discard the prompt (with no memory of which button, if any, was even near the cursor) defeats the entire point of asking first.
- **Escape dismisses, and is treated as Cancel.** Unlike an outside click, Escape is a deliberate, specific gesture — a user has to know the key exists and choose to press it, which is functionally the same intent as clicking Cancel. So it is wired to the exact same `handleCancel` path Cancel's own click handler calls: it fires `onCancel` (not left silent) and closes the surface. Escape is not treated as a shortcut for Confirm under any circumstance — a keyboard user backing out of a destructive action should never have that action fire because they reached for the "get me out of here" key.

The one thing this component will not do is let a destructive action complete without an explicit, on-target activation of the Confirm button.

## Accessibility

- `role="alertdialog"` with `aria-modal="true"`. `aria-labelledby`/`aria-describedby` point at the title/description elements — only when those props are given.
- **Cancel is focused first, not Confirm** — see the dismiss decision above for the reasoning behind treating Cancel as the default answer. No extra wiring is needed for this: Cancel renders before Confirm in the panel's markup, which is what makes it the shared focus-trap primitive's default target (the first focusable descendant) whenever `initialFocus` is not given.
- The warning icon (`⚠`) is `aria-hidden` — it is reinforcement for sighted users, not the thing that communicates the stakes; `title` and `description` carry that for everyone.
- Confirm renders through `Button`'s `destructive` variant, so its color signal (not its only signal — the label and the description both say what it does) matches every other destructive action in the library.

## Implementation notes

- Built on the same internal `DialogSurface` primitive `Dialog` renders through — portal, backdrop, focus trap, scroll lock. See `Dialog`'s own README for that plumbing's details, including "Portal-before-focus-trap ordering" — the reason `use:portal` and `use:focusTrap` live on the exact same element in a specific source order, and why getting that wrong leaves focus silently on `document.body` instead of the panel. This component only wires the role, the dismiss defaults above, and the fixed action pair on top of it.
- `Confirm`/`Cancel` are `Button` instances (`destructive` and `outline`), not hand-rolled — reusing the family's own button rather than a bespoke pair keeps this component's actions visually and behaviorally consistent with every other destructive action already in the library, at the cost of not matching the design mockup's bespoke button metrics pixel-for-pixel (`Button`'s `sm` size uses a 6px radius and tighter padding than the mockup's own hand-tuned numbers).
- The panel border reads `border-destructive/25` on top of the shared surface's own `border-border`, tinting the panel itself toward the destructive palette even before either button is read.
