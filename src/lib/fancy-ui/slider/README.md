# Slider

A restyled native `<input type="range">` — one handle, one numeric value, an
optional bubble that tracks it and optional end labels for the bounds.

## Components

- `Slider` - A real range input with a purple-to-cyan gradient fill and a
  glowing thumb, keeping every native keyboard and pointer behaviour intact

## Usage

```svelte
<script>
	import { Slider } from "fancy-ui-svelte";

	let volume = $state(60);
</script>

<Slider bind:value={volume} label="Volume" showValue />
```

Or handle the change yourself instead of binding:

```svelte
<script>
	import { Slider } from "fancy-ui-svelte";

	function onValueChange(value) {
		console.log("volume is now", value);
	}
</script>

<Slider value={60} {onValueChange} label="Volume" />
```

Inside a `FormField`, drop the `label`/`id` — the surrounding field supplies
`controlId`, `aria-describedby`, `aria-invalid` and `disabled` automatically:

```svelte
<FormField label="Volume">
	<Slider bind:value={volume} showValue />
</FormField>
```

## Props

| Prop            | Type                       | Default | Description                                                         |
| --------------- | -------------------------- | ------- | ------------------------------------------------------------------- |
| `value`         | `number`                   | `0`     | Current value; bindable                                             |
| `onValueChange` | `(value: number) => void`  | —       | Called with the new value on every input event                      |
| `min`           | `number`                   | `0`     | Lower bound                                                         |
| `max`           | `number`                   | `100`   | Upper bound                                                         |
| `step`          | `number`                   | `1`     | Increment size, including fractional steps                          |
| `disabled`      | `boolean`                  | `false` | Blocks dragging and keyboard interaction; overridden by a FormField |
| `id`            | `string`                   | —       | Element id; overridden by a FormField's own `controlId`             |
| `name`          | `string`                   | —       | Native `name`, read on form submission                              |
| `label`         | `string`                   | —       | Accessible name — for a control with no visible Label next to it    |
| `showValue`     | `boolean`                  | `false` | Shows the current value in a bubble that tracks the thumb           |
| `showBounds`    | `boolean`                  | `false` | Shows `min` and `max` as end labels below the track                 |
| `class`         | `string`                   | —       | Additional CSS classes, applied to the outer wrapper                |
| `ref`           | `HTMLInputElement \| null` | `null`  | Bindable reference to the underlying `<input type="range">`         |
| `sound`         | `boolean`                  | `false` | Plays the `tick` cue on a committed value change, once sound is on  |

## Theming

The fill gradient's two stops have no semantic tokens, so they are declared
locally with `light-dark()` fallbacks — the same shape every other control in
this wave uses for its accent:

```css
.my-form {
	--ft-accent: oklch(0.55 0.2 300);
}
```

Set `--ft-accent` higher up the tree to retint the purple end of every
`Slider` beneath it; the cyan end (`--ft-slider-accent-end`, `#42cfff` in dark
mode) is local to the component and not exposed as a variable to override.

## Sound

Set `sound` to play the `tick` cue through the shared sound controller (see
[`sound/README.md`](../sound/README.md)) whenever a value is committed —
once on drag release, once per committed keyboard step:

```svelte
<Slider bind:value={volume} sound label="Volume" />
```

It is wired to the input's `change` event, not `input` — dragging fires
`input` continuously and stays silent, so the cue never repeats faster than a
value is actually committed. `tick` is itself engine-rate-limited to 40ms as
a second line of defence (see the sound package's silence contract). Off by
default; nothing plays unless both `sound` is set here **and** the user has
turned sound on globally. Nothing plays while `disabled`, whether that comes
from this component's own prop or a surrounding `FormField`.

## Implementation Notes

- Built on a real `<input type="range">`, not a hand-rolled div-based track —
  dragging, arrow keys, Home/End, and screen reader announcements all come
  from the browser for free, driven by the native `min`/`max`/`step`
  attributes and the `aria-valuemin`/`aria-valuemax`/`aria-valuenow` triad set
  explicitly alongside them.
- A native range input has no cross-browser "filled portion" of its own. The
  current fraction (`(value - min) / (max - min)`) is computed once in script
  and published as the `--ft-slider-fill` custom property; WebKit's
  `::-webkit-slider-runnable-track` paints both the filled and unfilled
  colours in one hard-stop gradient off that property, while Firefox paints
  the filled portion as a separate `::-moz-range-progress` layer since
  `::-moz-range-track` has no equivalent hook.
- `::-webkit-slider-thumb` and `::-moz-range-thumb` are written as two
  separate CSS rules on purpose: a selector list is invalid in its entirety
  the moment one vendor pseudo-element in it is unrecognised, so combining
  them would make the whole rule silently drop in whichever browser doesn't
  own the other vendor's part.
- `aria-required` is deliberately never set, even inside a `FormField` whose
  context reports `required: true` — the ARIA slider role does not support
  it, since a range always carries a numeric value and has no "empty" state
  to require filling in. Any visible required marker belongs to the
  FormField's own Label, not to this input.
- `showValue`'s bubble and `showBounds`'s end labels are `aria-hidden`: the
  input's own `aria-valuenow` (and `aria-valuemin`/`aria-valuemax`) already
  carry those numbers to assistive tech, so the visible echoes are muted to
  avoid double announcements.
- `--ft-slider-accent` and `--ft-slider-accent-end` are declared on the outer
  wrapper, not on the input itself, so the value bubble — a sibling `<span>`,
  not a descendant of the input — can inherit the same cyan for its text
  colour instead of a second hardcoded value. Custom properties inherit down
  the whole subtree but not sideways between siblings, which is what forces
  them up a level.
- **`value` is clamped to `[min, max]`, not passed straight through.** A
  native range input clamps its own displayed/dragged value silently, but a
  `value` prop set out of range — or left there after `max` shrinks below it
  at runtime — would otherwise leave `aria-valuenow` and the `showValue`
  bubble reporting the raw, unclamped number while the thumb sat wherever the
  browser actually clamped it: a mismatch a sighted user can see, not only an
  aria one. Every render reads a `clampedValue` derived value instead of the
  raw prop, so this is correct from the very first paint (including SSR).
  The bindable `value` itself is also corrected — the same way `NumberInput`
  clamps on blur — via an effect scoped to react only to `min`/`max`
  changing (`value` is read through `untrack` inside it), which is what keeps
  it from being the same "read and write one `$state` inside one effect"
  shape the rest of this wave avoids.
