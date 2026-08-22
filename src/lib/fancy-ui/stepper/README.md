# Stepper

A multi-step progress indicator — `Stepper` owns the active index; each
`Step` derives its own number and status (done / current / upcoming) from
its position among its registered siblings.

## Components

- `Stepper` - The `<ol>` root; owns the active index and the shared context
- `Step` - One step; registers with the nearest `Stepper` and renders its bullet, label, and connector

## Usage

```svelte
<script>
	import { Stepper, Step } from "fancy-ui-svelte";

	let current = $state(1);
</script>

<Stepper bind:current>
	<Step label="Account" />
	<Step label="Profile" />
	<Step label="Confirmation" />
</Stepper>
```

Vertical, with secondary descriptions:

```svelte
<Stepper bind:current orientation="vertical">
	<Step label="Account" description="Create your login" />
	<Step label="Profile" description="Tell us about yourself" />
	<Step label="Confirmation" description="Review and finish" />
</Stepper>
```

Clickable, so a reader can jump between steps directly:

```svelte
<script>
	import { Stepper, Step } from "fancy-ui-svelte";

	let current = $state(0);
	function onStepClick(index) {
		console.log("Jumped to step", index);
	}
</script>

<Stepper bind:current clickable {onStepClick}>
	<Step label="Account" />
	<Step label="Profile" />
	<Step label="Confirmation" />
</Stepper>
```

## Props

### Stepper

| Prop              | Type                         | Default        | Description                                                                            |
| ----------------- | ---------------------------- | -------------- | -------------------------------------------------------------------------------------- |
| `current`         | `number`                     | `0`            | The active step's 0-based index. Bindable                                              |
| `onCurrentChange` | `(current: number) => void`  | —              | Called with the new index whenever it changes, however the change happened             |
| `orientation`     | `"horizontal" \| "vertical"` | `"horizontal"` | The rail's stacking axis                                                               |
| `clickable`       | `boolean`                    | `false`        | Whether steps render as buttons a reader can click to jump between them                |
| `onStepClick`     | `(index: number) => void`    | —              | Called with a step's index when it's activated by a click. Only fires when `clickable` |
| `children`        | `Snippet`                    | —              | The `Step`s                                                                            |
| `class`           | `string`                     | —              | Additional CSS classes                                                                 |
| `ref`             | `HTMLOListElement \| null`   | `null`         | Bindable element reference                                                             |

### Step

| Prop          | Type                    | Default | Description                                                           |
| ------------- | ----------------------- | ------- | --------------------------------------------------------------------- |
| `label`       | `string`                | —       | The step's primary label (required)                                   |
| `description` | `string`                | —       | Optional secondary line shown under the label                         |
| `children`    | `Snippet`               | —       | Overrides the bullet's default content (checkmark / number / outline) |
| `class`       | `string`                | —       | Additional CSS classes                                                |
| `ref`         | `HTMLLIElement \| null` | `null`  | Bindable element reference                                            |

## Theming

Two custom properties, both consumed on `Step` (the root `<ol>` never paints
either one itself):

- **`--ft-status-done`** colours a completed step's bullet and the connector
  segment leading into it — the same shared "operation landed" token
  `CopyButton`, `PasswordInput` and `FileUpload` read. Retint it once and
  every success surface across the library, `Stepper` included, moves
  together.
- **`--ft-nav-accent`** colours the current step's bullet fill and its halo —
  the same nav-family accent `Pagination`'s focus ring reads. Falls back to
  the shared `--ft-accent` if that's set higher up the tree, and otherwise to
  the library's own purple:

```css
--ft-nav-accent: var(
	--ft-accent,
	light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
);
```

Retint just this component:

```css
.my-wizard {
	--ft-status-done: oklch(0.6 0.17 145);
	--ft-nav-accent: oklch(0.7 0.18 250);
}
```

Both defaults are `light-dark()` pairs, so **your theme must declare
`color-scheme`** for the right half to be picked:

```css
:root {
	color-scheme: light dark;
}
```

One optional variable tunes the motion. It falls back to the library-wide
token, which falls back to a literal, so leaving it unset is the supported
default:

| Variable                    | Default                          | What it controls                                     |
| --------------------------- | -------------------------------- | ---------------------------------------------------- |
| `--ft-step-signal-duration` | `var(--ft-duration-fast, 150ms)` | How long a step's colour and halo take to cross-fade |

## Motion

- A step's whole visible state — the bullet's fill, its label colour, the
  halo around the current bullet, and the connector segment behind it — now
  cross-fades over 150 ms instead of arriving in a single frame. This is the
  component's first motion of any kind.
- **Reduced motion.** This transition is deliberately **not** gated behind
  `prefers-reduced-motion`. None of the three properties moves anything: a
  colour that cross-fades and a static halo that appears are state changes,
  not travel, and suppressing them would make an advancing stepper flicker
  rather than settle.
- The focus ring is untouched by this, because it lives on a different
  element (`.ft-step-trigger`) from every signal. No focus indicator is ever
  animated.
- **Touch and coarse pointers.** Nothing here is pointer-driven — the whole
  effect follows `current` — so a coarse pointer needs no special handling.

## Implementation Notes

- `Stepper` and `Step` share a `Symbol`-keyed context (`STEPPER_KEY` /
  `StepperContext` in `types.ts`), the same "root owns the shared state,
  items read it" shape `ToggleGroup`/`ToggleGroupItem` use. A `Step` outside
  a `Stepper` degrades to a plain, always-`"upcoming"`, never-clickable item
  instead of throwing.
- A step's number and status come from its position among its registered
  siblings, never from a prop — `register`/`indexOf` on the context, keyed by
  a stable per-instance id from `$props.id()` (not `_internals/id.ts`'s
  `uid()`, which is client-only and would break SSR here). Registration
  order is trusted as step order: steps are a static composition (typically
  one `{#each}` over a fixed list) that doesn't reorder after mount, unlike
  the live-DOM-position re-query `menu.svelte.ts` needs for arrow-key
  navigation under reordering. **Consequence, not just precondition:**
  reordering already-mounted `Step`s without adding or removing one leaves
  every step's number, status, checkmark and `aria-current` pinned to its
  original mount position — a keyed `{#each}` reorder moves the instance
  without re-running its registration effect, so `indexOf` keeps returning
  where it first mounted. Adding or removing a step settles correctly, since
  that's a genuine mount/unmount; only pure reordering is affected. If your
  steps genuinely reorder in place, force a remount instead of relying on a
  keyed `{#each}` to move the instance: wrap each `Step` in
  `{#key currentIndex}` (the item's _current_ array position, not a stable
  id — keying by a stable id is what preserves the instance across a
  reorder in the first place) so a reorder remounts it and its registration
  effect re-runs in the new order.
- Registration runs inside a `Step`'s own `$effect`, register on mount and
  unregister as that same effect's cleanup — and the entire body of both has
  to run inside `untrack`, not just the `includes`/`indexOf` lookup:
  `.push()`/`.splice()` also read the array to do their job, so untracking
  only the lookup still leaves the mutating call itself tracked, and the
  effect ends up depending on the very array its own call just mutated. See
  `ToggleGroup`'s identical comment for the fuller account of the loop this
  avoids.
- Status is never colour-only: a done bullet shows a checkmark, a current
  bullet shows its number with the accent halo, an upcoming bullet shows its
  number inside an outline — and every bullet carries an `sr-only` span
  ("completed" / "current step" / "not started").
- A connector segment is coloured by the step it leads _away from_: done if
  that step is done, muted otherwise. It's an `aria-hidden` `<span>`, never
  announced.
- `clickable` changes what a step's bullet-plus-label renders as: a real
  `<button type="button">` when true, a plain non-focusable wrapper when
  false — never a `tabindex="0"` element with no behaviour behind it. Both
  paths render through the same two snippets internally, so the bullet and
  label markup never has to be written twice.
- `label` is required, not merely conventional: with it omitted and no
  `children` override, a clickable step's only accessible text is its
  `sr-only` status span — every upcoming step in the same `Stepper` would
  compute to the identical "not started, button" with nothing distinguishing
  one from another.
