# Switch

A sliding on/off control, built on a real `<input type="checkbox" role="switch">`.

## Components

- `Switch` - A native checkbox restyled into a track and knob, with
  `aria-invalid`/`aria-describedby` wired to a surrounding `FormField` when
  there is one

## Usage

```svelte
<script>
	import { Switch } from "fancy-ui-svelte";

	let notifications = $state(false);
</script>

<Switch bind:checked={notifications}>Notifications</Switch>
```

Or handle the change yourself instead of binding:

```svelte
<script>
	import { Switch } from "fancy-ui-svelte";

	function onCheckedChange(checked) {
		console.log("notifications is now", checked);
	}
</script>

<Switch {onCheckedChange}>Notifications</Switch>
```

Three sizes:

```svelte
<Switch size="sm" />
<Switch size="md" />
<Switch size="lg" />
```

Inside a `FormField`, drop the `id` wiring entirely — the field context
supplies `controlId`, `aria-describedby`, `required` and `disabled` (Switch
has no own `invalid` prop, but still reflects a surrounding `FormField`'s
invalid state — derived from whether `error` is set — through
`aria-invalid`). `FormField`'s own `label` prop renders its heading:

```svelte
<script>
	import { FormField, Switch } from "fancy-ui-svelte";
</script>

<FormField label="Notifications">
	<Switch bind:checked={notifications} />
</FormField>
```

## Props

| Prop              | Type                         | Default | Description                                                                                                |
| ----------------- | ---------------------------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| `checked`         | `boolean`                    | `false` | Whether the switch is on; bindable                                                                         |
| `onCheckedChange` | `(checked: boolean) => void` | —       | Called with the new value whenever the switch is activated                                                 |
| `disabled`        | `boolean`                    | `false` | Blocks interaction; excluded from form submission                                                          |
| `required`        | `boolean`                    | `false` | Native `required`                                                                                          |
| `id`              | `string`                     | —       | Element id                                                                                                 |
| `name`            | `string`                     | —       | Native `name`, read on form submission                                                                     |
| `value`           | `string`                     | —       | Form value submitted while on                                                                              |
| `label`           | `string`                     | —       | Accessible name, rendered as `aria-label`; skip it when `children` already supplies the visible label text |
| `children`        | `Snippet`                    | —       | Visible label text, rendered beside the track                                                              |
| `size`            | `"sm" \| "md" \| "lg"`       | `"md"`  | Track/knob size                                                                                            |
| `class`           | `string`                     | —       | Additional CSS classes, merged onto the wrapping `<label>`                                                 |
| `ref`             | `HTMLInputElement \| null`   | `null`  | Bindable element reference to the native `<input>`                                                         |

`required` and `disabled`, plus the element's `id`, are overridden by a
surrounding `FormField`'s own context — see Implementation Notes.

## Theming

The on-state track color and focus ring have no semantic token in the app's
theme layer, so they fall back to a `light-dark()` accent pair local to the
component:

```css
.my-settings {
	--ft-accent: oklch(0.55 0.2 300);
}
```

Set `--ft-accent` higher up the tree to retint every `Switch` beneath it.

## Implementation Notes

- **A switch takes effect immediately**, unlike a checkbox in a form that
  waits for a submit step — reach for `Switch` for a setting that applies the
  moment it's flipped (e.g. "Notifications: on"), and `Checkbox` for a choice
  that is part of a larger submission (e.g. "I agree to the terms").
- Uncontrolled and controlled usage both work from the same `checked` prop:
  bind it with `bind:checked`, or leave it out and read `onCheckedChange`
  instead — `checked` is declared `$bindable`, so a plain, non-bound `checked`
  plus a callback also works.
- The native input IS the track, restyled with `appearance: none` — not a
  `<div>` with a click handler. The knob is a `::after` pseudo-element on the
  same input, not a second DOM node, so the input stays the only focusable,
  checkable element.
- On/off is perceivable without colour: the knob's position (left vs. right)
  is the primary cue at every size, and the knob itself swaps between a muted
  grey (off) and white (on) — never colour alone, and never dependent on
  hue discrimination.
- The knob's slide is the only animation in this component. It lives behind
  `@media (prefers-reduced-motion: no-preference)`; under reduced motion the
  knob still lands in the correct position, it just snaps instead of sliding.
  Colour changes (track and knob fill) are not gated the same way, matching
  `Toggle`'s and `Input`'s own hover/pressed/focus colour transitions — only
  actual movement is treated as motion to opt out of.
- Track/knob geometry is exact pixel values per size (`32×18`/`40×22`/`48×26`
  tracks with `12`/`16`/`20` px knobs), not the closest Tailwind scale step,
  so the three sizes stay proportioned to each other and the knob's travel
  always lands exactly on `track width − knob size − 2 × inset`.
- `getField()` (from the shared `_internals/field.svelte.ts` context) is
  `undefined` outside a `FormField`. `controlId`, `aria-describedby`,
  `required` and `disabled` fall back to this component's own prop of the
  same name in that case; `aria-invalid` falls back to `false` since Switch
  has no own `invalid` prop.
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
  accidentally fights the track's shape.

## Sound

`sound?: boolean` (default `false`) plays a short confirmation cue through the
sound controller whenever the switch actually flips — `toggle-on` turning it
on, `toggle-off` turning it off. Nothing plays while `disabled` (own prop or
a surrounding `FormField`). Off by default; the cue is only audible once the
user has separately turned sound on. See `sound/README.md` for how the
preference and playback work.
