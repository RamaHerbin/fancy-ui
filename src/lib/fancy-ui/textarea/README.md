# Textarea

A multi-line text field — the same resting/focus/error/disabled looks as
`Input`, plus an optional character counter and auto-growing height, built on
a real `<textarea>`.

## Components

- `Textarea` - A native `<textarea>` restyled to the library's field
  geometry, with `aria-invalid`/`aria-describedby` wired to a surrounding
  `FormField` when there is one

## Usage

```svelte
<script>
	import { Textarea } from "fancy-ui-svelte";

	let message = $state("");
</script>

<Textarea bind:value={message} placeholder="A multi-line message…" label="Message" />
```

With a character counter:

```svelte
<Textarea bind:value={message} maxlength={500} showCount label="Message" />
```

With auto-resize instead of an internal scrollbar:

```svelte
<Textarea bind:value={message} autoResize rows={3} label="Message" />
```

Inside a `FormField`, drop the `id`/`invalid` wiring entirely — the field
context supplies `controlId`, `aria-describedby`, `aria-invalid`, `required`
and `disabled`. `FormField` takes a `label` string and renders its own
`Label`; there is no `invalid` prop on it — passing `error` text is what
marks the field invalid:

```svelte
<script>
	import { FormField, Textarea } from "fancy-ui-svelte";
</script>

<FormField label="Bio" error={bio.length > 500 ? "Keep it under 500 characters." : undefined}>
	<Textarea bind:value={bio} maxlength={500} showCount />
</FormField>
```

## Props

| Prop            | Type                          | Default | Description                                                                 |
| --------------- | ----------------------------- | ------- | --------------------------------------------------------------------------- |
| `value`         | `string`                      | `""`    | Current value; bindable                                                     |
| `onValueChange` | `(value: string) => void`     | —       | Called with the new value on every input event                              |
| `placeholder`   | `string`                      | —       | Shown while the field is empty                                              |
| `disabled`      | `boolean`                     | `false` | Blocks focus and typing; excluded from form submission                      |
| `readonly`      | `boolean`                     | `false` | Blocks typing but stays focusable and is still submitted, unlike disabled   |
| `required`      | `boolean`                     | `false` | Native `required`                                                           |
| `invalid`       | `boolean`                     | `false` | Drives the error border and `aria-invalid`                                  |
| `id`            | `string`                      | —       | Element id                                                                  |
| `name`          | `string`                      | —       | Native `name`, read on form submission                                      |
| `autocomplete`  | `string`                      | —       | Native `autocomplete` hint                                                  |
| `label`         | `string`                      | —       | Accessible name — for a control with no visible Label next to it            |
| `rows`          | `number`                      | `3`     | Visible height in text rows before anything grows it; also the no-JS height |
| `maxlength`     | `number`                      | —       | Native character ceiling; also the counter's denominator                    |
| `showCount`     | `boolean`                     | `false` | Renders the live "n / max" counter under the field                          |
| `autoResize`    | `boolean`                     | `false` | Grows to fit content instead of scrolling; disables manual resize           |
| `class`         | `string`                      | —       | Additional CSS classes — applied to the `<textarea>`, not its wrapper       |
| `ref`           | `HTMLTextAreaElement \| null` | `null`  | Bindable element reference                                                  |

All of `disabled`, `required` and `invalid`, plus the element's `id`, are
overridden by a surrounding `FormField`'s own context — see Implementation
Notes.

## Theming

The focus ring color has no semantic token in the app's theme layer, so it
falls back to a `light-dark()` accent pair local to the component:

```css
.my-form {
	--ft-accent: oklch(0.55 0.2 300);
}
```

Set `--ft-accent` higher up the tree to retint every `Textarea` beneath it.

## Implementation Notes

- Uncontrolled and controlled usage both work from the same `value` prop:
  bind it with `bind:value`, or leave it out and read `onValueChange`
  instead — `value` is declared `$bindable`, so a plain, non-bound `value`
  plus a callback also works and the field still updates as the user types.
- `getField()` (from the shared `_internals/field.svelte.ts` context) is
  `undefined` outside a `FormField`. Every context-sensitive value —
  `controlId`, `aria-describedby`, `aria-invalid`, `required`, `disabled` —
  falls back to this component's own prop of the same name in that case.
- `Textarea` is a real, labelable `<textarea>`, so it is labelled the plain
  way: `FormField`'s `Label` resolves `for={controlId}`, `Textarea` carries
  that same id, and the native `for`/`id` pairing does the rest — no
  `aria-labelledby` needed. That pairing only works because the element on
  the other end of `controlId` is labelable in the first place; a control
  whose root isn't a labelable element (a `role="radiogroup"` wrapper, say)
  can't rely on it and needs `FieldContext`'s `labelId` instead.
- **The counter is not a live region.** A polite `aria-live` region firing on
  every keystroke would re-announce the count constantly while someone is
  mid-sentence — genuinely unpleasant with a screen reader running. Instead
  the visible counter span carries an `id`, and that `id` is folded into
  `aria-describedby` (alongside whatever a surrounding `FormField` already
  contributes there). A screen reader reads a field's description once, on
  focus, so the count is announced when the user tabs in and again if they
  tab away and back — never on every character.
- Reaching `maxlength` flips `data-limit-reached="true"` on the counter,
  which the scoped stylesheet turns into a weight change, not a colour
  change — the state is perceivable without seeing colour, and the
  `n / max` text itself already says the same thing to a screen reader
  through the description wiring above.
- `autoResize` measures line-height, padding and border once (`measure()`,
  memoized) and then, on every input, sets `height: auto` before reading
  `scrollHeight` and writing the new height back — reading and writing are
  both plain DOM/style operations, never a `$state`, so the `$effect` that
  also calls `grow()` (for value changes that don't pass through the input
  handler — a bound assignment from outside, a restored draft) can never
  re-trigger itself.
- `rows` doubles as the no-JS fallback: the native `rows` attribute is always
  set, so a `Textarea` with `autoResize` still renders at a sane height and
  is fully usable if JavaScript never runs.
- Without `autoResize`, the box keeps the browser's native vertical resize
  handle (`resize-y`); with it, manual resize is disabled (`resize-none`) so
  the two growth mechanisms never fight each other.
