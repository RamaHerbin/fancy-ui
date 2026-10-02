# Stepper

A multi-step progress indicator — `Stepper` owns the active index; each
`Step` derives its own number and status (done / current / upcoming) from
its position among its registered siblings.

## The look

Steps sit on **light rails**. Between two bullets runs a hairline track;
when a step is completed, the rail leaving it fills with a single run of
light — a soft comet with a bright head travels once along the track, and
the rail settles to the accent at reduced strength. A jump across several
steps lights the rails one after another, so it reads as one continuous
run from the old step to the new one, and each bullet on the way settles
as the light reaches it. Stepping back retracts the rails from the far end.

The current bullet carries a calm, **breathing halo** (a soft accent ring
whose opacity rises and falls every 2.4 s — no scaling). A completed
bullet swaps its number for a check with a short flip, and the check
**draws itself**. Upcoming bullets are a quiet hairline ring.

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
| `sound`           | `boolean`                    | `false`        | Plays the `select` cue whenever a clickable step moves to a different step             |

### Step

| Prop          | Type                    | Default | Description                                                           |
| ------------- | ----------------------- | ------- | --------------------------------------------------------------------- |
| `label`       | `string`                | —       | The step's primary label (required)                                   |
| `description` | `string`                | —       | Optional secondary line shown under the label                         |
| `children`    | `Snippet`               | —       | Overrides the bullet's default content (checkmark / number / outline) |
| `class`       | `string`                | —       | Additional CSS classes                                                |
| `ref`         | `HTMLLIElement \| null` | `null`  | Bindable element reference                                            |

## Sound

Set `sound` on `Stepper` to play the `select` cue whenever a clickable step moves the active step to a different one, through the shared sound controller (see [`sound/README.md`](../sound/README.md)):

```svelte
<Stepper bind:current clickable sound>
	<Step label="Account" />
	<Step label="Profile" />
	<Step label="Confirmation" />
</Stepper>
```

It is opt-in and silent by default: nothing plays unless both `sound` is set on `Stepper` **and** the user has turned sound on globally (through `SoundToggle` or `sound.enable()`). The cue lives inside `select()`, gated behind its existing `if (!clickable) return` — a non-`clickable` `Stepper` never plays anything, the same as it never fires `onStepClick`. Re-clicking the already-current step plays nothing (the changed-only guard), even though `onStepClick`/`onCurrentChange` still fire on that same click exactly as they always did — the guard gates only the cue.

## Theming

Two custom properties, both consumed on `Step` (the root `<ol>` never paints
either one itself):

- **`--ft-status-done`** colours a completed step's bullet — the same shared
  "operation landed" token
  `CopyButton`, `PasswordInput` and `FileUpload` read. Retint it once and
  every success surface across the library, `Stepper` included, moves
  together.
- **`--ft-nav-accent`** colours the current step's bullet fill, its halo,
  and the lit rails —
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

A few optional variables fine-tune the rails and the motion. Each falls back
to a derived value, so leaving them unset is the supported default:

| Variable                    | Default                          | What it controls                                                                    |
| --------------------------- | -------------------------------- | ----------------------------------------------------------------------------------- |
| `--ft-step-rail`            | `--ft-nav-accent` at 58%         | The colour a lit rail settles to. Set it to `var(--ft-status-done)` for green rails |
| `--ft-step-glint`           | the accent mixed toward white    | The bright head of the travelling light                                             |
| `--ft-step-outline`         | `var(--border)`                  | The hairline ring around an upcoming bullet                                         |
| `--ft-step-sweep-duration`  | `420ms`                          | How long the light takes to cross one rail; a multi-step run staggers by 0.7 of it  |
| `--ft-step-signal-duration` | `var(--ft-duration-fast, 150ms)` | How long a step's colours and outline take to cross-fade                            |

The rail sweep and the check draw use `--ft-ease-out` (falling back to
`cubic-bezier(0.16, 1, 0.3, 1)`), the same arrival curve as the rest of the
library.

## Motion

- **Rail sweep.** When a rail lights, its fill grows along the track
  (`transform: scaleX`, `scaleY` when vertical) over 420 ms while a comet
  (`::after`, a transparent → accent → bright-head gradient with a small
  glow) rides exactly on the fill's leading edge, then fades once it has
  arrived. The comet is keyed on the lit class, so it plays once each time a
  rail lights, plus once on first paint as an arrival.
- **Run ordering.** `Stepper` remembers the step the light set off from;
  each rail gets `--ft-step-order` (beats since the run started) and each
  bullet the light travels to gets `--ft-step-arrival`, so the fill, the
  bullet colour, the check flip and the halo all land in sequence.
- **Breathing halo.** The current bullet's ring lives on its own `::before`
  layer and breathes through `opacity` (0.5 → 1, 1.2 s each way). It fades in
  when the light arrives.
- **Check draw.** The done glyph flips in (`rotateX` 90° → 0°, 200 ms) and its
  stroke draws via `stroke-dashoffset` (320 ms) on a `pathLength="1"` path.
- A step's colours — bullet fill, outline, label, the rail's settled colour —
  cross-fade over 150 ms either way.
- **Reduced motion.** Only the colour cross-fades remain: rails fill by
  colour at full length, no comet, no stagger, the halo is a still ring, and
  the check appears instantly. It is gated twice: every travelling rule sits
  in `@media (prefers-reduced-motion: no-preference)` **and** behind the
  `.ft-step-animate` class, which `Stepper` hands to its steps only on the
  client once it has read the preference (the root also reports
  `data-motion="full" | "reduced"`). Server-rendered markup is the still
  composition. The colour cross-fades are deliberately **not** gated: a
  colour that cross-fades and a static halo are state changes, not travel,
  and suppressing them would make an advancing stepper flicker rather than
  settle.
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
- A rail is lit by the step it leads _away from_: lit if that step is done,
  a bare hairline track otherwise. Horizontally each step draws the rail
  arriving at it (no rail before the first step); vertically each step draws
  the rail leaving it (no rail after the last). It's an `aria-hidden`
  `<span class="ft-step-connector">` with `ft-step-connector-done
ft-step-connector-lit` when lit, never announced. Its two layers (`::before`
  fill, `::after` light) are pseudo-elements, so they add nothing to the
  accessibility tree.
- In vertical orientation the bullet column reaches into the step's bottom
  padding (`-mb-7` against the li's `pb-7`) so the rail has the gap between
  two steps to span.
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
