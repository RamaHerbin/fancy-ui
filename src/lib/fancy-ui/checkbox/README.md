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

The checked/indeterminate fill and focus ring color have no semantic token in
the app's theme layer, so they fall back to a `light-dark()` accent pair local
to the component:

```css
.my-form {
	--ft-accent: oklch(0.55 0.2 300);
}
```

Set `--ft-accent` higher up the tree to retint every `Checkbox` beneath it.

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
- Checked and indeterminate each render their own shape (a rotated checkmark
  corner vs. a flat dash), not only a colour difference between the two, and
  disabled dims through opacity plus `cursor: not-allowed` — colour is never
  the only cue. Invalid gets both a border-colour echo at rest and an outline
  ring (offset outside the box, past the focus halo) that persists once
  checked or indeterminate fills the box and turns its own border transparent
  — without the ring, the invalid cue would silently disappear the moment the
  box gets checked.
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
