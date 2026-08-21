# Select

A single-choice dropdown built on a real `<button role="combobox">` and a
portalled `role="listbox"` panel — not a native `<select>`, because the
panel's styling (accent-highlighted rows, a portalled floating surface) isn't
achievable on one. That trade means this component reimplements what a
native `<select>` gives away for free, and it aims to get every piece of it
right: focus never leaves the trigger, the active option is tracked with
`aria-activedescendant`, and typing while closed selects by typeahead exactly
like the browser's own control does.

## Components

- `Select` — the trigger button, the (internal, unexported) portalled panel,
  and all of the keyboard/typeahead/positioning wiring between them

## Usage

```svelte
<script lang="ts">
	import { Select } from "fancy-ui-svelte";

	const frameworks = [
		{ value: "svelte", label: "Svelte 5" },
		{ value: "react", label: "React" },
		{ value: "vue", label: "Vue" },
	];

	let framework = $state("svelte");
</script>

<Select options={frameworks} bind:value={framework} label="Framework" />
```

Or handle the change yourself instead of binding:

```svelte
<Select
	options={frameworks}
	onValueChange={(value) => console.log("now", value)}
	label="Framework"
/>
```

Inside a `FormField`, drop `id`/`invalid`/`required`/`disabled` entirely —
the field context supplies all four, the same way it does for `Input`:

```svelte
<FormField label="Plan" required error={plan === "" ? "Choose a plan." : undefined}>
	<Select options={plans} bind:value={plan} placeholder="Select a plan" />
</FormField>
```

A disabled option is skipped by keyboard navigation, typeahead and pointer
selection, but still renders (dimmed) so the caller can show it exists:

```svelte
<Select
	options={[
		{ value: "us", label: "United States" },
		{ value: "ap", label: "Asia Pacific (coming soon)", disabled: true },
	]}
/>
```

Give it a `name` to make it participate in a real form:

```svelte
<form>
	<Select options={plans} bind:value={plan} name="plan" />
</form>
```

## Props

| Prop            | Type                                     | Default    | Description                                                                       |
| --------------- | ---------------------------------------- | ---------- | --------------------------------------------------------------------------------- |
| `options`       | `SelectOption[]`                         | —          | The choices, in order — `{ value, label, disabled? }`                             |
| `value`         | `string`                                 | `""`       | The selected value, bindable — `""` means nothing is selected                     |
| `onValueChange` | `(value: string) => void`                | —          | Called with the new value whenever the selection changes                          |
| `placeholder`   | `string`                                 | —          | Shown in the trigger while nothing is selected                                    |
| `disabled`      | `boolean`                                | `false`    | Blocks opening; excludes the control from form submission                         |
| `required`      | `boolean`                                | `false`    | Marks the control required (`aria-required`) — see the form-validation note below |
| `invalid`       | `boolean`                                | `false`    | Drives the error border and `aria-invalid`                                        |
| `id`            | `string`                                 | —          | Element id                                                                        |
| `name`          | `string`                                 | —          | Native `name`. When set, a hidden input carries the value into the form           |
| `label`         | `string`                                 | —          | Accessible name — for a control with no visible Label next to it                  |
| `side`          | `"top" \| "bottom" \| "left" \| "right"` | `"bottom"` | Side of the trigger to place the panel on                                         |
| `align`         | `"start" \| "center" \| "end"`           | `"start"`  | Alignment along the trigger's cross axis                                          |
| `class`         | `string`                                 | —          | Additional CSS classes, merged onto the trigger                                   |
| `ref`           | `HTMLButtonElement \| null`              | `null`     | Bindable reference to the trigger button                                          |
| `sound`         | `boolean`                                | `false`    | Plays `open`/`select` cues — see [Sound](#sound) below                            |

All of `disabled`, `required` and `invalid`, plus the element's `id`, are
overridden by a surrounding `FormField`'s own context — see Implementation
Notes.

## Theming

The focus ring and the selected-row checkmark share one accent, with no
semantic Tailwind token of its own — the same `light-dark()` fallback shape
`Input`, `Toggle` and `Button` all use:

```css
.my-form {
	--ft-accent: oklch(0.55 0.2 300);
}
```

Set `--ft-accent` higher up the tree to retint every `Select` beneath it. The
component reads it through a local `--ft-field-accent` custom property, only
ever declared inside its own scoped styles — nothing here depends on a token
existing in a consumer's theme.

## Keyboard behaviour

| Key                             | While closed                                                             | While open                                                                         |
| ------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `Enter` / `Space` / `ArrowDown` | Opens, activates the selected option or the first enabled one            | `Enter`/`Space` commits the active option and closes                               |
| `ArrowUp`                       | Opens, activates the selected option or the **last** enabled one         | Moves the highlight to the previous enabled option                                 |
| `ArrowDown`                     | (see above)                                                              | Moves the highlight to the next enabled option, skipping a disabled run as a block |
| `Home` / `End`                  | —                                                                        | Jumps to the first / last enabled option                                           |
| `Escape`                        | —                                                                        | Closes **without** changing `value`                                                |
| `Tab`                           | —                                                                        | Commits the active option, closes, then moves focus on — see below                 |
| any printable character         | Selects by typeahead **without opening** — what a native `<select>` does | Moves the highlight by typeahead; does not commit until `Enter`/`Tab`              |

**Tab's behaviour is a deliberate choice, not left implicit.** With the panel
open, `Tab` commits whatever is highlighted — the same as `Enter` — and then
lets the browser move focus on to the next control exactly as it would have
anyway (this component never calls `preventDefault()` on `Tab`). The
alternative, closing without committing, would silently discard a highlight
the user very likely meant to pick the moment they looked away from the
control. If a caller genuinely wants "leaving without picking" to be
possible, `Escape` already does exactly that.

## Sound

Set `sound` to opt into interface cues, off by default and silent until the
user has enabled sound in their own preferences:

```svelte
<Select options={frameworks} bind:value={framework} sound />
```

`open` plays when the panel opens; `select` plays once a choice commits —
by a click, Enter/Space, Tab, or typing a match while closed. Escape and an
outside click play `close` instead, and never both: a commit is one cue, a
dismiss is the other, never `select` followed by `close` for the same
interaction. Re-picking the already-selected option changes nothing, so it
plays no `select` — the same silent early return `onValueChange` gets — and
the panel closes as a dismissal, with `close`, rather than in silence.
Toggling the trigger shut with nothing highlighted stays a `close`.

## Implementation Notes

- **Focus never leaves the trigger — because each row cancels its own
  mousedown, not merely because nothing calls `.focus()`.** The panel's rows
  carry `role="option"` and `tabindex="-1"`, and the active row is
  communicated purely through `aria-activedescendant` on the trigger, which
  is why `SelectPanel` — unlike `PopoverContent` — does not use
  `focus-trap.ts` at all. But a real mousedown on _any_ element carrying a
  `tabindex` attribute, `-1` included, moves DOM focus to it as the
  browser's own default action, whether or not application code ever calls
  `.focus()` — so without a guard, clicking a row would still focus the row
  first, and once the click commits and the panel unmounts, focus would fall
  through to `document.body` instead of staying on the trigger. Each row's
  own `onmousedown` calls `preventDefault()` to cancel exactly that default
  action, the same technique `PasswordInput`'s reveal toggle already uses on
  its own `mousedown` to keep focus off the button and on the input.
- **`aria-controls` only exists while the panel does.** The trigger's
  `aria-controls` attribute is entirely absent while closed, not present and
  pointing at nothing — the same rule `Popover` follows, and one this wave's
  own brief called out by name after an earlier pass shipped the opposite in
  two components.
- **The listbox core is shared, not reimplemented per control.**
  `_internals/listbox.svelte.ts` owns "move by delta, skipping disabled runs
  as a block, terminating instead of looping forever if everything is
  disabled" and "accumulate typeahead within a short window, cycle on a
  repeated character" — `Combobox`, `Autocomplete` and `TimePicker` consume
  the exact same module. See its own tests for the disabled-block and
  infinite-loop guarantees specifically.
- **Closed-state typeahead commits immediately; open-state typeahead only
  highlights.** Both paths go through the same `createListbox().typeahead()`
  call and the same `onActiveChange` callback — the callback itself is what
  branches on whether the panel is open, mirroring exactly what a native
  `<select>` does (typing while collapsed changes the value outright; a
  listbox that's already open just moves the highlight until something
  commits it).
- **`getField()`** (from `_internals/field.svelte.ts`) is `undefined` outside
  a `FormField`. Every context-sensitive value — `controlId`,
  `aria-describedby`, `aria-invalid`, `required`, `disabled` — falls back to
  this component's own prop of the same name in that case, via `??` (never
  `||`, so a context value of `false` still wins over a control prop of
  `true`).
- **The trigger is labelable, so it uses `controlId` with `<label for>`, not
  `labelId`.** `FormField`'s own `<Label for={controlId}>` targets this
  button directly, the same way `Input` is labelled — there is no
  `aria-labelledby` path to wire here, unlike a control whose root is a
  `<div role="radiogroup">`.
- **`required` has no real native form-validation enforcement.** Unlike
  `RadioGroup` (real `<input type="radio" required>` elements) or `Input`
  (a real `<input required>`), this control's root is a `<button>` and its
  form value travels through a `type="hidden"` input — and `required` has no
  effect on a hidden input under the HTML spec (hidden inputs never
  participate in constraint validation, `required` or not). `aria-required`
  and the `invalid`/error-border wiring are real; a submit-blocking "you must
  choose one" is not, and a consumer that needs one has to check `value`
  itself before submitting. Documented here rather than silently assumed,
  because it is the one piece of "what native gives you" this component
  cannot actually reproduce.
- **The hidden input tracks `disabled`.** While the control is disabled, its
  hidden input carries `disabled` too, so it drops out of `FormData` — the
  same as a real `<select disabled>` would.
- **A native `disabled` attribute is not trusted alone.** Every handler
  (`click`, `keydown`) also checks `effectiveDisabled` itself, since a
  synthetic dispatch (as a test, or some assistive tech, can produce) walks
  straight past the native attribute the same way it does on a plain
  `<button>`.
- **`SelectOption.value` is the `{#each}` key.** Options are meant to have
  unique values — that is what makes a value a valid _selection_ in the
  first place — so keying by `value` is both the natural identity for this
  data shape and safe under reordering, unlike a positional index.
- **`SelectPanel` is intentionally not exported.** Unlike `Popover`/`PopoverContent`,
  there is no supported way to compose this control's panel by hand — the
  whole point of the `options` prop is that the panel is fully generated from
  it. Keeping it unexported keeps the public surface to exactly `Select`,
  `SelectProps` and `SelectOption`.
