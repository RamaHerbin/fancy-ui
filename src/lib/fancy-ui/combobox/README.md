# Combobox

A single-line text field over a **closed set** of options: the user picks
one of `options`, and typing only ever filters that list — it never adds to
it. A value outside the list is never valid. If the field is left with text
that names nothing real, it resolves back to the last valid selection (or
clears, if there was none).

Combobox and [Autocomplete](../autocomplete/README.md) look alike and solve
different problems. Reach for Combobox when the answer must be one of a
known set — a framework, a country, a status — the way you would reach for a
`<select>` but want the list filterable by typing. Reach for Autocomplete
when any text is acceptable and the list is only there to save keystrokes —
a city name, a search query, a tag the user might type themselves.

## Components

- `Combobox` — the field, the (internal, unexported) portalled listbox
  panel, and all the filtering/keyboard/positioning wiring between them

## Usage

```svelte
<script>
	import { Combobox } from "fancy-ui-svelte";

	const frameworks = [
		{ value: "svelte-5", label: "Svelte 5" },
		{ value: "sveltekit", label: "SvelteKit" },
		{ value: "react", label: "React" },
	];

	let framework = $state("");
</script>

<Combobox options={frameworks} bind:value={framework} label="Framework" />
```

Or handle the change yourself instead of binding:

```svelte
<script>
	import { Combobox } from "fancy-ui-svelte";
</script>

<Combobox
	options={frameworks}
	onValueChange={(value) => console.log("value is now", value)}
	label="Framework"
/>
```

Inside a `FormField`, drop the `id`/`invalid` wiring entirely — the field
context supplies `controlId`, `aria-describedby`, `aria-invalid`, `required`
and `disabled`, the same as `Input`:

```svelte
<FormField label="Framework" required error={framework ? undefined : "Pick one."}>
	<Combobox options={frameworks} bind:value={framework} />
</FormField>
```

### A custom filter

```svelte
<Combobox
	options={frameworks}
	filter={(option, query) => option.value.startsWith(query.toLowerCase())}
/>
```

## Props

| Prop            | Type                                                 | Default                               | Description                                                              |
| --------------- | ---------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------ |
| `options`       | `ComboboxOption[]`                                   | —                                     | The closed set of selectable options                                     |
| `value`         | `string`                                             | `""`                                  | The selected option's value, or `""` when nothing is selected. Bindable  |
| `onValueChange` | `(value: string) => void`                            | —                                     | Called whenever the selection commits                                    |
| `placeholder`   | `string`                                             | —                                     | Shown while the field is empty and nothing is selected                   |
| `disabled`      | `boolean`                                            | `false`                               | Blocks focus and typing; excluded from form submission                   |
| `required`      | `boolean`                                            | `false`                               | Native `required`                                                        |
| `invalid`       | `boolean`                                            | `false`                               | Drives the error border and `aria-invalid`                               |
| `id`            | `string`                                             | —                                     | Element id                                                               |
| `name`          | `string`                                             | —                                     | Native `name` — see Implementation Notes for how it's actually submitted |
| `label`         | `string`                                             | —                                     | Accessible name — for a control with no visible Label next to it         |
| `filter`        | `(option: ComboboxOption, query: string) => boolean` | case-insensitive substring on `label` | Matches an option against the current query                              |
| `emptyMessage`  | `string`                                             | `"No results"`                        | Shown in the panel when no option matches the current query              |
| `class`         | `string`                                             | —                                     | Additional CSS classes                                                   |
| `ref`           | `HTMLInputElement \| null`                           | `null`                                | Bindable reference to the input element                                  |

`ComboboxOption` is `{ value: string; label: string; disabled?: boolean }`.

All of `disabled`, `required` and `invalid`, plus the element's `id`, are
overridden by a surrounding `FormField`'s own context.

## Theming

The focus ring color has no semantic token in the app's theme layer, so it
falls back to a `light-dark()` accent pair local to the component, the same
shape `Input` uses:

```css
.my-form {
	--ft-accent: oklch(0.55 0.2 300);
}
```

Set `--ft-accent` higher up the tree to retint the focus ring on every
`Combobox` beneath it. The panel itself uses the shared `bg-popover` /
`text-popover-foreground` / `border-border` tokens, same as `Popover`, and
the active row uses `bg-accent` / `text-accent-foreground` — no
component-local tokens of its own.

## Motion

The panel enters with a 150 ms opacity + scale rise (the shared `fast` rung and out-curve, applied in JS — there is no `--ft-*`
variable to override for this entrance), growing from a `0.92` floor — the same entrance every
floating surface in the library uses. The growth origin follows the side the
panel was **actually** placed on, so a list that flips above the input when the
input sits low in the viewport grows from its bottom edge rather than its top,
and always appears to come out of the field.

The resolved placement is published on the panel as `data-side` and
`data-align`, for consumers that want to key their own styling off where it
landed.

- **Reduced motion** — no entrance animation at all; the panel simply appears.
  Its visibility never depended on the animation, so nothing is lost.
- **Touch and coarse pointers** — unchanged; the entrance is not pointer-gated
  and plays identically on touch.
- Closing is currently instant.

## Implementation Notes

- **On focus, the panel shows the whole list.** While the visible text still
  equals the selected option's own label — true both before the user has
  touched the field at all and right after a fresh selection — nothing is
  filtered out. The moment the typed text diverges from that label, real
  filtering kicks in against `filter` (or the default: case-insensitive
  substring on `label`).
- **A closed set has to resolve on the way out.** Whatever is left in the
  field either names a real option, or it doesn't. Escape, an outside click,
  and a plain blur all funnel through the same rule: revert to the last
  valid selection's label, or clear when there wasn't one. Nothing is ever
  left showing text that names no real option.
- **The highlighted span is a real, literal match — never a lie.** Labels
  are split around the matched range and rendered as plain text nodes plus
  one `<strong>`, never `{@html}`. The span comes from an independent
  case-insensitive substring search over `label`, not from whatever logic a
  custom `filter` used to select the option — so when a custom filter
  matches for a reason that isn't a literal substring (an acronym, a fuzzy
  match, a different field entirely), the label renders plain rather than
  highlighting a span that would misrepresent the match.
- **Submission carries `value`, not the visible text.** The input's own DOM
  `value` is always the option's `label` (what a person reads), so it cannot
  also carry `name` without submitting that label instead of the actual
  value — the same reason a native `<select>` submits its `value` and not
  its displayed text. When `name` is set, a hidden `<input type="hidden">`
  carries the real `name`/`value` pair alongside the visible field.
  `required` stays off the hidden input (a `type="hidden"` input is barred
  from constraint validation in every browser) and lives on the visible
  input instead, where real validation UI can attach to it.
- **The active row and `aria-activedescendant` are the whole keyboard
  story.** Focus never leaves the input; there is no focus trap on the
  panel, unlike `Popover`. Rows are real `<button type="button">`s (a
  `<div role="listbox">`, not a `<ul>`, since a button is not a permitted
  child of `<ul>`) so the accessibility linter's own rule — a clickable
  element needs a keyboard handler — is satisfied honestly rather than
  suppressed, kept out of the tab sequence with `tabindex="-1"`, with
  `onmousedown` calling `preventDefault()` so a click never blurs the input
  a beat before its own `onclick` commits the selection.
- **The live region announces a count, not the contents.** A polite
  `role="status"` region — always mounted, whether or not the panel is open,
  the same pattern `ComposerCommandMenu`'s announcement uses — reports "N
  results" as the list changes. It never reads out the option labels
  themselves, so fast typing doesn't turn into a screen reader narrating
  every keystroke's worth of rows.
- **A run of disabled options is skipped as a block**, and typing never
  activates a disabled row, via the shared `_internals/listbox.svelte.ts`
  contract — the same navigation core `Select`, `Autocomplete` and
  `TimePicker` consume.
- `getField()` (from the shared `_internals/field.svelte.ts` context) is
  `undefined` outside a `FormField`. Every context-sensitive value —
  `controlId`, `aria-describedby`, `aria-invalid`, `required`, `disabled` —
  falls back to this component's own prop of the same name in that case, so
  the control never throws and never renders unlabelled just because there
  is no surrounding `FormField`.
