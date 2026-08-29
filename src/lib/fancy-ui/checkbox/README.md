# Checkbox

A tri-look, boolean-underneath checkbox — unchecked, checked, indeterminate and
disabled looks, built on a real `<input type="checkbox">`.

## Components

- `Checkbox` - A native checkbox restyled to the library's control geometry,
  with `aria-invalid`/`aria-describedby` wired to a surrounding `FormField`
  when there is one

## Usage

```svelte
<script>
	import { Checkbox } from "fancy-ui-svelte";

	let agreed = $state(false);
</script>

<Checkbox bind:checked={agreed}>I agree to the terms</Checkbox>
```

Or handle the change yourself instead of binding:

```svelte
<script>
	import { Checkbox } from "fancy-ui-svelte";

	function onCheckedChange(checked) {
		console.log("agreed is now", checked);
	}
</script>

<Checkbox {onCheckedChange}>I agree to the terms</Checkbox>
```

Indeterminate is a separate, bindable prop — the box still has a real
`checked` value underneath, and any interaction resolves straight to it:

```svelte
<script>
	import { Checkbox } from "fancy-ui-svelte";

	let allChecked = $state(false);
	let noneChecked = $state(true);
</script>

<Checkbox checked={allChecked} indeterminate={!allChecked && !noneChecked}>Select all</Checkbox>
```

Inside a `FormField`, drop the `id`/`invalid` wiring entirely — the field
context supplies `controlId`, `aria-describedby`, `aria-invalid` (derived from
whether `error` is set), `required` and `disabled`. `FormField`'s own `label`
prop renders its heading; `Checkbox`'s `children` is still the control's own
inline accessible label — the two serve different purposes:

```svelte
<script>
	import { FormField, Checkbox } from "fancy-ui-svelte";

	let agreed = $state(false);
</script>

<FormField label="Terms" required error={agreed ? undefined : "You must agree before continuing."}>
	<Checkbox bind:checked={agreed}>I agree to the terms and conditions</Checkbox>
</FormField>
```

## Props

| Prop              | Type                         | Default | Description                                                                                                |
| ----------------- | ---------------------------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| `checked`         | `boolean`                    | `false` | Whether the box is checked; bindable                                                                       |
| `indeterminate`   | `boolean`                    | `false` | Mixed/dash visual state; bindable                                                                          |
| `onCheckedChange` | `(checked: boolean) => void` | —       | Called with the new checked value whenever the box is activated                                            |
| `disabled`        | `boolean`                    | `false` | Blocks interaction; excluded from form submission                                                          |
| `required`        | `boolean`                    | `false` | Native `required`                                                                                          |
| `invalid`         | `boolean`                    | `false` | Drives the error border and `aria-invalid`                                                                 |
| `id`              | `string`                     | —       | Element id                                                                                                 |
| `name`            | `string`                     | —       | Native `name`, read on form submission                                                                     |
| `value`           | `string`                     | —       | Form value submitted while checked                                                                         |
| `label`           | `string`                     | —       | Accessible name, rendered as `aria-label`; skip it when `children` already supplies the visible label text |
| `children`        | `Snippet`                    | —       | Visible label text, rendered beside the box                                                                |
| `class`           | `string`                     | —       | Additional CSS classes, merged onto the wrapping `<label>`                                                 |
| `ref`             | `HTMLInputElement \| null`   | `null`  | Bindable element reference to the native `<input>`                                                         |

All of `disabled`, `required` and `invalid`, plus the element's `id`, are
overridden by a surrounding `FormField`'s own context — see Implementation
Notes.

## Theming

| Variable                      | Default                                                               | Applies to                                        |
| ----------------------------- | --------------------------------------------------------------------- | ------------------------------------------------- |
| `--ft-accent`                 | `light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))` | The checked/indeterminate fill and the focus ring |
| `--ft-checkbox-draw-duration` | `var(--ft-duration-base, 300ms)`                                      | How long the mark takes to draw itself            |

The fill and focus-ring colour have no semantic token in the app's theme layer,
so they fall back to a `light-dark()` accent pair local to the component:

```css
.my-form {
	--ft-accent: oklch(0.55 0.2 300);
}
```

Set `--ft-accent` higher up the tree to retint every `Checkbox` beneath it.

`--ft-checkbox-draw-duration` is the one escape hatch on the draw: the family
default matches `StatusMorph`'s check exactly, so the library has one
check-draw at one speed, but a dense form where boxes are flipped constantly
can shorten it without leaving the scale:

```css
.my-dense-table {
	--ft-checkbox-draw-duration: var(--ft-duration-fast, 150ms);
}
```

## Motion

The mark draws itself. Both shapes are real stroked SVG paths normalised with
`pathLength="1"`, so checking the box animates `stroke-dashoffset` from `1` to
`0` over `300ms` (`--ft-duration-base`) on `--ft-ease-out` — the same technique
and the same clock as `StatusMorph`'s check, deliberately, so the library has
one check-draw rather than two. The box's own fill and border cross-fade first,
on `150ms` (`--ft-duration-fast`, `--ft-ease-inout`): the two are ordered, not
parallel — the box fills, then the mark is drawn onto the filled box.

Both paths are always present, each waiting at `stroke-dashoffset: 1` until its
own state matches, which is what makes **indeterminate → checked** one gesture:
the dash un-draws while the tick draws, over the same window, instead of one
shape being swapped for another.

`checked` and `indeterminate` are not mutually exclusive — `checked` is the real
state underneath even while `indeterminate` is true. With both set, the **dash
wins the shape**, so the mark says exactly what `aria-checked="mixed"` already
announces rather than drawing a tick and a dash on top of one another.

- **Reduced motion** — only the `transition` sits inside
  `@media (prefers-reduced-motion: no-preference)`. The resting and drawn
  `stroke-dashoffset` values are outside it, so without motion the mark is
  simply there, whole, the instant the box is checked. It is never invisible
  for want of an animation. The colour channel is not gated at all — a colour
  change is not motion.
- **Touch and coarse pointers** — unchanged; nothing here is pointer-driven,
  and the mark takes no pointer events, so a tap anywhere on the box reaches
  the native `<input>` underneath.
- **Forced colors** — the mark strokes `currentColor` against a colour set on
  the SVG itself, so a forced palette re-colours the mark and the box behind it
  from the same system colours. No `@media (forced-colors: active)` block, and
  nothing to keep in sync with one.
- **Keyboard** — identical to the pointer path: `Space` fires the native
  change, and the draw is keyed off `:checked` / `:indeterminate`, never off a
  pointer event.

## Implementation Notes

- Uncontrolled and controlled usage both work from the same `checked` prop:
  bind it with `bind:checked`, or leave it out and read `onCheckedChange`
  instead — `checked` is declared `$bindable`, so a plain, non-bound `checked`
  plus a callback also works.
- `indeterminate` has no HTML attribute — it exists only as a DOM property, so
  it cannot be set from markup. The component assigns it to the element in an
  `$effect` that reruns on every change to the prop, not only on mount, which
  is what keeps a later `indeterminate = true` (e.g. from a "select all"
  computation) actually reaching the box.
- Indeterminate is not a third value of `checked` — the box always has a real
  `checked` boolean underneath. Any interaction clears `indeterminate` back to
  `false` and resolves straight to that underlying value, the same way a
  native indeterminate checkbox behaves when a user clicks it.
- `getField()` (from the shared `_internals/field.svelte.ts` context) is
  `undefined` outside a `FormField`. Every context-sensitive value —
  `controlId`, `aria-describedby`, `aria-invalid`, `required`, `disabled` —
  falls back to this component's own prop of the same name in that case, so
  the control never throws and never renders unlabelled just because there is
  no surrounding `FormField`.
- Checked and indeterminate each render their own shape (a drawn tick vs. a
  flat dash), not only a colour difference between the two, and disabled dims
  through opacity plus `cursor: not-allowed` — colour is never the only cue.
  Invalid gets both a border-colour echo at rest and an outline ring (offset
  outside the box, past the focus halo) that persists once checked or
  indeterminate fills the box and turns its own border transparent — without
  the ring, the invalid cue would silently disappear the moment the box gets
  checked.
- The mark is an SVG **sibling** overlaid on the input, not a child of it: the
  control is a real `<input type="checkbox">`, and an `<input>` is a void
  element that cannot contain anything. That is the whole reason the markup
  carries one wrapper `<span>` — it is the positioning context the overlay
  needs, and nothing else lives on it. The SVG is `aria-hidden` and
  `focusable="false"` (older engines put SVGs in the tab order on their own)
  and takes no pointer events, so the input still receives every click.
- `label` always renders as `aria-label` when passed, whether or not
  `children` is also given — the component has no way to inspect an arbitrary
  `Snippet` to tell whether it renders visible text, so it trusts the prop
  rather than guessing from `children`'s mere presence. Pass `label` alongside
  icon-only `children`; skip it when `children` already supplies the visible
  text, since passing both makes `aria-label` win the accessible name over
  that visible text.
- The native `disabled` attribute already blocks real interaction, but a
  synthetic event dispatched straight at the element — as some assistive tech
  and test tooling do — walks past that guard. The change handler checks
  `disabled` itself and, if the element's own DOM `checked` property was
  mutated directly regardless, puts it back to match the component's own
  state rather than trusting the guard alone.
- `class` merges onto the wrapping `<label>`, not the input itself — the
  input's own geometry classes are fixed so a consumer's class never
  accidentally fights the box's shape.

## Sound

`sound?: boolean` (default `false`) plays a short confirmation cue through the
sound controller whenever the box actually toggles — `toggle-on` when it
becomes checked, `toggle-off` when it becomes unchecked. Nothing plays while
`disabled` (own prop or a surrounding `FormField`), and an indeterminate box
still resolves to a real boolean before the cue is chosen. Off by default;
the cue is only audible once the user has separately turned sound on. See
`sound/README.md` for how the preference and playback work.
