# Input

A single-line text field — resting, focus, error and disabled looks, built on
a real `<input>`.

## Components

- `Input` - A native `<input>` restyled to the library's field geometry, with
  `aria-invalid`/`aria-describedby` wired to a surrounding `FormField` when
  there is one

## Usage

```svelte
<script>
	import { Input } from "fancy-ui-svelte";

	let email = $state("");
</script>

<Input bind:value={email} type="email" placeholder="name@example.com" label="Email" />
```

Or handle the change yourself instead of binding:

```svelte
<script>
	import { Input } from "fancy-ui-svelte";

	function onValueChange(value) {
		console.log("value is now", value);
	}
</script>

<Input {onValueChange} label="Email" />
```

Inside a `FormField`, drop the `id`/`invalid` wiring entirely — the field
context supplies `controlId`, `aria-describedby`, `aria-invalid`, `required`
and `disabled`. `FormField` takes a `label` string and renders its own
`Label`; there is no `invalid` prop on it — passing `error` text is what
marks the field invalid:

```svelte
<script>
	import { FormField, Input } from "fancy-ui-svelte";
</script>

<FormField
	label="Username"
	required
	error={username.length < 3 ? "Minimum 3 characters." : undefined}
>
	<Input bind:value={username} />
</FormField>
```

## Props

| Prop            | Type                                                                        | Default  | Description                                                               |
| --------------- | --------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------- |
| `value`         | `string`                                                                    | `""`     | Current value; bindable                                                   |
| `onValueChange` | `(value: string) => void`                                                   | —        | Called with the new value on every input event                            |
| `type`          | `"text" \| "email" \| "url" \| "tel" \| "password" \| "search" \| "number"` | `"text"` | Native input type                                                         |
| `placeholder`   | `string`                                                                    | —        | Shown while the field is empty                                            |
| `disabled`      | `boolean`                                                                   | `false`  | Blocks focus and typing; excluded from form submission                    |
| `readonly`      | `boolean`                                                                   | `false`  | Blocks typing but stays focusable and is still submitted, unlike disabled |
| `required`      | `boolean`                                                                   | `false`  | Native `required`                                                         |
| `invalid`       | `boolean`                                                                   | `false`  | Drives the error border and `aria-invalid`                                |
| `id`            | `string`                                                                    | —        | Element id                                                                |
| `name`          | `string`                                                                    | —        | Native `name`, read on form submission                                    |
| `autocomplete`  | `FullAutoFill`                                                              | —        | Native `autocomplete` hint                                                |
| `label`         | `string`                                                                    | —        | Accessible name — for a control with no visible Label next to it          |
| `class`         | `string`                                                                    | —        | Additional CSS classes                                                    |
| `ref`           | `HTMLInputElement \| null`                                                  | `null`   | Bindable element reference                                                |

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

Set `--ft-accent` higher up the tree to retint every `Input` beneath it.

## Implementation Notes

- Uncontrolled and controlled usage both work from the same `value` prop:
  bind it with `bind:value`, or leave it out and read `onValueChange`
  instead — `value` is declared `$bindable`, so a plain, non-bound `value`
  plus a callback also works and the field still updates as the user types.
- `getField()` (from the shared `_internals/field.svelte.ts` context) is
  `undefined` outside a `FormField`. Every context-sensitive value —
  `controlId`, `aria-describedby`, `aria-invalid`, `required`, `disabled` —
  falls back to this component's own prop of the same name in that case, so
  the control never throws and never renders unlabelled just because there is
  no surrounding `FormField`.
- `Input` is a real, labelable `<input>`, so it is labelled the plain way:
  `FormField`'s `Label` resolves `for={controlId}`, `Input` carries that same
  id, and the native `for`/`id` pairing does the rest — no `aria-labelledby`
  needed. That pairing only works because the element on the other end of
  `controlId` is labelable in the first place; a control whose root isn't a
  labelable element (a `role="radiogroup"` wrapper, say) can't rely on it and
  needs `FieldContext`'s `labelId` instead.
- The error state is `border-destructive/50` plus `aria-invalid="true"`, not
  colour alone — the error text itself (rendered by `FormField`) is what a
  screen reader actually hears; the border is the sighted cue.
- Disabled uses `disabled:opacity-50 disabled:cursor-not-allowed` rather than
  a hand-picked dimmed fill, so it composes with every other state (invalid,
  focus) without a second set of overrides.
- The focus ring is a local `--ft-input-accent` custom property with a
  `light-dark()` fallback, the same shape `Toggle` and `Button` use — there is
  no semantic Tailwind token for the brand accent.
- `readonly` is the native attribute only; no extra JS guards it, because a
  readonly field never fires `input` from real typing in the first place.
  `disabled` gets a guard in the input handler in addition to the native
  attribute, since a synthetic `dispatchEvent` walks straight past
  `disabled` the same way a synthetic click does on a button.
