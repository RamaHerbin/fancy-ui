# PasswordInput

A single-line password field — a show/hide reveal toggle, and an optional
strength meter for nudging a user toward a better password while they type.

## Components

- `PasswordInput` - A native `<input type="password">`, wrapped in the
  library's field geometry, with `aria-invalid`/`aria-describedby` wired to a
  surrounding `FormField` when there is one

## Usage

```svelte
<script>
	import { PasswordInput } from "fancy-ui-svelte";

	let password = $state("");
</script>

<PasswordInput bind:value={password} label="Password" />
```

Encourage a strong password while it's created — pair `showStrength` with
`autocomplete="new-password"` so a password manager offers to generate one:

```svelte
<PasswordInput
	bind:value={password}
	autocomplete="new-password"
	showStrength
	label="New password"
/>
```

Inside a `FormField`, drop the `id`/`invalid` wiring entirely — the field
context supplies `controlId`, `aria-describedby`, `aria-invalid`, `required`
and `disabled`:

```svelte
<FormField label="Password" required {error}>
	<PasswordInput bind:value={password} />
</FormField>
```

## Props

| Prop            | Type                                                         | Default              | Description                                                                   |
| --------------- | ------------------------------------------------------------ | -------------------- | ----------------------------------------------------------------------------- |
| `value`         | `string`                                                     | `""`                 | Current value; bindable                                                       |
| `onValueChange` | `(value: string) => void`                                    | —                    | Called with the new value on every input event                                |
| `placeholder`   | `string`                                                     | —                    | Shown while the field is empty                                                |
| `disabled`      | `boolean`                                                    | `false`              | Blocks focus and typing; excluded from form submission                        |
| `readonly`      | `boolean`                                                    | `false`              | Blocks typing but stays focusable and is still submitted, unlike disabled     |
| `required`      | `boolean`                                                    | `false`              | Native `required`                                                             |
| `invalid`       | `boolean`                                                    | `false`              | Drives the error border and `aria-invalid`                                    |
| `id`            | `string`                                                     | —                    | Element id                                                                    |
| `name`          | `string`                                                     | —                    | Native `name`, read on form submission                                        |
| `label`         | `string`                                                     | —                    | Accessible name — for a control with no visible Label next to it              |
| `autocomplete`  | `"current-password" \| "new-password" \| "off"`              | `"current-password"` | `"new-password"` opts a password manager into offering to generate one        |
| `showToggle`    | `boolean`                                                    | `true`               | Renders the show/hide reveal button                                           |
| `showStrength`  | `boolean`                                                    | `false`              | Renders the strength meter and label once there's a value                     |
| `strength`      | `(value: string) => { score: 0\|1\|2\|3\|4; label: string }` | —                    | Overrides the built-in heuristic scorer — see Implementation Notes            |
| `class`         | `string`                                                     | —                    | Additional CSS classes, merged onto the field surface, not the bare `<input>` |
| `ref`           | `HTMLInputElement \| null`                                   | `null`               | Bindable element reference                                                    |

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

The "strong" tier of the strength meter reuses `--ft-status-done`, the same
success token `FormField`, `CopyButton` and other components read:

```css
.my-form {
	--ft-status-done: oklch(0.72 0.15 145);
}
```

## Implementation Notes

- **The built-in strength scorer is a heuristic, not a security control.** It
  only counts length and character-class variety (lowercase, uppercase,
  digit, symbol) — it has no notion of dictionary words, leaked-password
  lists, or keyboard-walk patterns, so a password like `Password1!` scores
  far better than it deserves to. Do not treat the score it returns as a
  measure of actual guessability. A real deployment needs a proper strength
  estimate computed server-side; pass a `strength` function to replace this
  scorer's output entirely once you have one.
- **Caret preservation on reveal.** Swapping `type` between `"password"` and
  `"text"` resets selection in some browsers even though it's the same
  element and the same characters. `selectionStart`/`selectionEnd`/
  `selectionDirection` are captured before the swap and restored — via
  `tick()`, so the restore runs only after the new `type` has actually
  reached the DOM — after it, so a mid-edit selection survives toggling
  visibility. The toggle button also calls `preventDefault()` on its own
  `mousedown`, so a mouse-driven click never steals focus off the input in
  the first place.
- **The toggle's state is perceivable, not just visible.** Its accessible
  name flips between "Show password" and "Hide password", and `aria-pressed`
  tracks the revealed state alongside it — both are attribute-level signals
  assistive tech picks up on their own, not something conveyed by the icon
  swap alone.
- **The strength label is never colour alone.** The bars are decorative
  (`aria-hidden`); the text label — "Very weak" through "Strong" — is what
  actually carries the meaning, and it's what's wired into `aria-describedby`
  for assistive tech. It's read once, on focus, rather than through a live
  region: Svelte only touches that text node when the label string itself
  changes, so it doesn't re-announce on every keystroke while the user is
  still typing.
- The meter only renders once `showStrength` is true and the field has a
  value — an empty, unfilled meter under an empty field describes nothing.
- `getField()` (from the shared `_internals/field.svelte.ts` context) is
  `undefined` outside a `FormField`. Every context-sensitive value —
  `controlId`, `aria-describedby`, `aria-invalid`, `required`, `disabled` —
  falls back to this component's own prop of the same name in that case.
- `PasswordInput` is a real, labelable `<input>`, so `FormField`'s `Label`
  resolves `for={controlId}` and the native `for`/`id` pairing does the rest —
  no `aria-labelledby` needed.
- The visual field surface — border, background, radius, focus ring — lives
  on the wrapping `<div>`, not the bare `<input>` inside it, since the reveal
  toggle shares that same row. The `class` prop merges onto that wrapper, and
  the focus ring reacts through `:focus-within` rather than the input's own
  `:focus-visible`.
