# NumberInput

A numeric field flanked by a decrement and an increment button, built on a
plain `<input type="text" inputmode="decimal">` — not `type="number"` — with
every keystroke parsed by hand and the native spinner replaced by the two
buttons.

## Components

- `NumberInput` - A text input with `−`/`+` step buttons that clamp to
  `min`/`max`, disable themselves at the bounds, and round every step to the
  step grid's own precision so fractional stepping never drifts

## Usage

```svelte
<script>
	import { NumberInput } from "fancy-ui-svelte";

	let quantity = $state(12);
</script>

<NumberInput bind:value={quantity} label="Quantity" />
```

Or handle the change yourself instead of binding:

```svelte
<script>
	import { NumberInput } from "fancy-ui-svelte";

	function onValueChange(value) {
		console.log("quantity is now", value); // number | null
	}
</script>

<NumberInput value={12} {onValueChange} label="Quantity" />
```

Inside a `FormField`, drop the `label`/`id`/`invalid`/`required`/`disabled` —
the surrounding field supplies `controlId`, `aria-describedby`,
`aria-invalid`, `required` and `disabled` automatically:

```svelte
<FormField label="Quantity" required>
	<NumberInput bind:value={quantity} min={1} max={99} />
</FormField>
```

## Props

| Prop            | Type                              | Default | Description                                                                   |
| --------------- | --------------------------------- | ------- | ----------------------------------------------------------------------------- |
| `value`         | `number \| null`                  | `null`  | Current value; bindable. `null` when the field is empty                       |
| `onValueChange` | `(value: number \| null) => void` | —       | Called with the new value on every change, including a clear to `null`        |
| `min`           | `number`                          | —       | Lower bound. Leave unset for no lower bound                                   |
| `max`           | `number`                          | —       | Upper bound. Leave unset for no upper bound                                   |
| `step`          | `number`                          | `1`     | Increment size, including fractional steps                                    |
| `disabled`      | `boolean`                         | `false` | Blocks focus, typing and the step buttons; overridden by a FormField          |
| `readonly`      | `boolean`                         | `false` | Blocks typing and the step buttons but stays focusable and is still submitted |
| `required`      | `boolean`                         | `false` | Native `required`; overridden by a FormField                                  |
| `invalid`       | `boolean`                         | `false` | Drives the error border and `aria-invalid`; overridden by a FormField         |
| `id`            | `string`                          | —       | Element id; overridden by a FormField's own `controlId`                       |
| `name`          | `string`                          | —       | Native `name`, read on form submission                                        |
| `label`         | `string`                          | —       | Accessible name — for a control with no visible Label next to it              |
| `class`         | `string`                          | —       | Additional CSS classes, applied to the outer bordered wrapper                 |
| `ref`           | `HTMLInputElement \| null`        | `null`  | Bindable reference to the underlying `<input>`                                |

## Implementation Notes

- **Why `type="text"`, not `type="number"`.** A real `type="number"` input
  sanitizes its own `.value` to `""` for _any_ syntactically incomplete
  number — `"9."`, `"-"`, `"1e"` all read back as the empty string,
  indistinguishable from a genuinely cleared field. Composing a decimal like
  `9.5` fires an `input` event right after the `.`, and treating that empty
  read as "the user cleared it" nulled the value mid-typing on every single
  fractional entry. There is no reliable, standard way to tell "incomplete"
  apart from "empty" on a `type="number"` input (`validity.badInput` is the
  spec's own answer, but is inconsistently implemented). Switching to a plain
  text input sidesteps the sanitization entirely: an internal `rawText` state
  always holds exactly what was typed, and `value` (the parsed number) only
  updates once that text is a complete, unambiguous number. `inputmode="decimal"`
  still gives mobile browsers the numeric keyboard hint `type="number"` used
  to provide for free.
- **The display and the parsed value are deliberately two different pieces of
  state.** While the field is focused, an internal effect that would
  otherwise resync the display from `value` is suppressed — resyncing
  mid-keystroke is exactly what would turn `"9."` back into `"9"` (or
  `"1.20"` back into `"1.2"`) before the rest of what was typed ever lands.
  The display is canonicalised (trailing `.`, lone `-`, extra trailing zeros
  all cleaned up) on blur instead.
- The two step buttons are real `<button type="button">` elements — never
  `type="submit"` by omission — and each carries its own `aria-label`
  ("Decrease value" / "Increase value"), since the `−`/`+` glyphs alone are
  not accessible names.
- Both buttons disable themselves the moment stepping further would cross
  `min` or `max`, rather than staying enabled and silently doing nothing on
  click. A synthetic click can still reach a disabled button's handler in
  some environments, so the same bound check also guards the click handler
  itself, not just the `disabled` attribute.
- **Arrow keys are reimplemented, not native.** `type="number"` supports
  ArrowUp/ArrowDown stepping for free; a plain text input does not, so
  keydown handling for both keys is added back explicitly, routed through the
  exact same stepping function the buttons use — so keyboard-driven and
  button-driven stepping can never round differently from each other.
- **Stepping rounds to the step grid's own precision, anchored at `min`** (or
  `0` with none set) — not just at `step`'s own decimal count. Anchoring at
  `step` alone breaks the moment the grid's arithmetic needs more precision
  than `step` carries: with `min={0.25} step={0.5}`, `0.25 + 0.5` is exactly
  `0.75`, but rounding that to `step`'s one decimal place would corrupt an
  already-exact result to `0.8`. Anchoring at `min` (2 decimal places here)
  keeps the full precision the grid actually needs.
- **A step that lands past a bound clamps there, and stepping afterward
  continues from the clamped value rather than re-snapping to the original
  grid.** With `min={0} max={10} step={3}`: `9 → 10` (clamped, would have
  been `12`), then `10 → 7 → 4 → 1` — never back on the original `0/3/6/9`
  grid. This is a deliberate choice matching how a native number input's own
  `stepUp()`/`stepDown()` keeps going from wherever clamping left it, rather
  than silently re-snapping to the nearest grid point. Pinned by a test.
- An empty field is `null`, never `0` or `NaN`. Stepping from empty mirrors
  the native `stepUp()`/`stepDown()` behaviour: the very first step lands
  exactly on `min` (or `0` when there is no `min`), not on `min + step`.
- Typing is not clamped keystroke-by-keystroke — that would make it
  impossible to type "50" past a lower number without every intermediate
  digit getting clipped. Clamping happens on blur instead.
