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
| `sound`         | `boolean`                                                    | `false`              | Plays `toggle-on`/`toggle-off` when the password is revealed or hidden        |

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

One optional variable tunes the motion. It falls back to the library-wide
token, which falls back to a literal, so leaving it unset is the supported
default:

| Variable                          | Default                          | What it controls                                   |
| --------------------------------- | -------------------------------- | -------------------------------------------------- |
| `--ft-password-strength-duration` | `var(--ft-duration-fast, 150ms)` | How long a strength segment takes to change colour |

## Motion

- **The strength meter eases its colour**, 150 ms per segment, so a password
  crossing a tier boundary mid-typing does not read as a flash. The segments
  never change size: they are a four-segment meter, and growing them would
  read as a progress bar filling rather than a tier changing.
- **The reveal toggle cross-fades its two icons** over 80 ms rather than
  cutting between them — at 16 px, a hard swap reads as a flicker. Both
  glyphs are stacked in one grid cell, so they can overlap during the fade
  without either one moving the other or changing the button's width.
- **Reduced motion.** The icon cross-fade collapses to zero duration, which
  makes Svelte skip the animation outright rather than run a zero-length one;
  the glyph still swaps, instantly. The strength meter's colour easing is
  deliberately **not** gated: a colour change is not motion, nothing about it
  travels or scales, and gating it would make a tier change snap for exactly
  the users who asked for a calmer interface.
- Nothing about the accessible state depends on the fade. `aria-label` and
  `aria-pressed` live on the `<button>`, not on either icon layer, and flip
  in the same update as the reveal itself; both glyphs are `aria-hidden`, so
  a screen reader never sees the overlap. The field's focus ring is a
  `box-shadow` and is never animated.
- **Touch and coarse pointers.** Nothing here follows the pointer or depends
  on hover. The reveal toggle is a real `<button>`, reachable and operable
  from the keyboard, and the selection restore that follows a toggle works
  the same on touch.

## Sound

Set `sound` to play `toggle-on`/`toggle-off` through the shared sound
controller (see [`sound/README.md`](../sound/README.md)) whenever the reveal
button flips the field between hidden and shown:

```svelte
<PasswordInput bind:value={password} sound label="Password" />
```

The cue lands synchronously inside the click, before `toggleReveal`'s own
`await tick()` that restores the caret — never after it, which would break
the in-gesture rule the way an unresumed `AudioContext` would on a reload.
Typing and the strength meter never play. Off by default; nothing plays
unless both `sound` is set here **and** the user has turned sound on
globally. Nothing plays while `disabled`.

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
