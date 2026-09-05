# Autocomplete

A single-line text field over an **open set** of suggestions: the user
types freely, and every character they type is already a valid value.
`suggestions` are advisory only — a shortcut for finishing a value the user
could have typed out in full — never a constraint on what the field may
hold. Think of a city field that suggests but accepts anything.

Autocomplete and [Combobox](../combobox/README.md) look alike and solve
different problems. Reach for Autocomplete when the field should accept
whatever the user types, with matching suggestions just there to save
keystrokes. Reach for Combobox when the answer must be one of a fixed,
known set.

## Components

- `Autocomplete` — the field, the (internal, unexported) portalled listbox
  panel, and all the filtering/keyboard/positioning wiring between them

## Usage

```svelte
<script>
	import { Autocomplete } from "fancy-ui-svelte";

	const cities = ["Paris", "Parma", "Prague", "London"];
	let city = $state("");
</script>

<Autocomplete suggestions={cities} bind:value={city} label="City" />
```

Or handle the change yourself instead of binding:

```svelte
<Autocomplete
	suggestions={cities}
	onValueChange={(value) => console.log("typed", value)}
	label="City"
/>
```

`onSelect` fires only when a suggestion is actually committed — a click or
Enter on a highlighted row — never from plain typing, which only ever fires
`onValueChange`:

```svelte
<Autocomplete
	suggestions={cities}
	bind:value={city}
	onSelect={(city) => console.log("picked a suggestion:", city)}
/>
```

Inside a `FormField`, drop the `id`/`invalid` wiring entirely — the field
context supplies `controlId`, `aria-describedby`, `aria-invalid`, `required`
and `disabled`, the same as `Input`:

```svelte
<FormField label="City">
	<Autocomplete suggestions={cities} bind:value={city} />
</FormField>
```

### Requiring more characters first

```svelte
<Autocomplete suggestions={cities} minLength={3} />
```

## Props

| Prop             | Type                           | Default | Description                                                              |
| ---------------- | ------------------------------ | ------- | ------------------------------------------------------------------------ |
| `suggestions`    | `string[]`                     | —       | Candidate strings offered as the user types                              |
| `value`          | `string`                       | `""`    | The free-text value. Bindable                                            |
| `onValueChange`  | `(value: string) => void`      | —       | Called with the new value on every keystroke                             |
| `onSelect`       | `(suggestion: string) => void` | —       | Called only when a suggestion is committed via click or Enter            |
| `placeholder`    | `string`                       | —       | Shown while the field is empty                                           |
| `disabled`       | `boolean`                      | `false` | Blocks focus and typing; excluded from form submission                   |
| `required`       | `boolean`                      | `false` | Native `required`                                                        |
| `invalid`        | `boolean`                      | `false` | Drives the error border and `aria-invalid`                               |
| `id`             | `string`                       | —       | Element id                                                               |
| `name`           | `string`                       | —       | Native `name`, read on form submission                                   |
| `label`          | `string`                       | —       | Accessible name — for a control with no visible Label next to it         |
| `minLength`      | `number`                       | `1`     | Characters required before suggestions appear                            |
| `maxSuggestions` | `number`                       | `8`     | Maximum number of suggestions shown at once                              |
| `class`          | `string`                       | —       | Additional CSS classes                                                   |
| `ref`            | `HTMLInputElement \| null`     | `null`  | Bindable reference to the input element                                  |
| `sound`          | `boolean`                      | `false` | Plays the `select` cue through the sound controller. See [Sound](#sound) |

All of `disabled`, `required` and `invalid`, plus the element's `id`, are
overridden by a surrounding `FormField`'s own context.

## Sound

Set `sound` to opt into interface cues, off by default and silent until the
user has enabled sound in their own preferences:

```svelte
<Autocomplete suggestions={cities} bind:value={city} sound />
```

`select` plays once a suggestion commits — by a row click or Enter on the
active row — and only when it actually changes `value`; re-picking the
suggestion already in force plays nothing, the same changed-only rule every
other value-holding component follows (Select, Tabs, DatePicker, ...),
`onValueChange`/`onSelect` still fire either way. Typing, the focus-open and
blur-close, and a suggestion list auto-closing because the query stopped
matching all stay silent — there is no `close` cue here, the same shape as
[Combobox](../combobox/README.md).

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
`Autocomplete` beneath it. The panel itself uses the shared `bg-popover` /
`text-popover-foreground` / `border-border` tokens, same as `Popover`, and
the active row uses `bg-accent` / `text-accent-foreground` — no
component-local tokens of its own.

## Motion

The suggestion list arrives and leaves on one bidirectional transition — the
shared `fast` rung, 150 ms in each direction, applied in JS (there is no
`--ft-*` variable to override it). It rises from a `0.92` scale floor on the
out-curve and collapses to `0.96` on the in-curve: leaving is a smaller gesture
than arriving, and a full-depth collapse on dismiss reads as the list being
sucked away rather than simply closing. It is the same motion every floating
surface in the library uses.

The growth origin follows the side the panel was **actually** placed on, so a
list that flips above the input when the input sits low in the viewport grows
from its bottom edge rather than its top, and always appears to come out of the
field and go back into it.

Neither direction plays on every keystroke: while the list stays open,
refiltering only swaps rows. A query that stops matching does close it — and
because both directions share one bidirectional transition, a keystroke that
matches again mid-fade **reverses** the exit from wherever it had got to rather
than starting a second list over the top of the first.

The resolved placement is published on the panel as `data-side` and
`data-align`, for consumers that want to key their own styling off where it
landed. While the list is on screen it carries `data-state="open"`; for the
length of the exit it carries `data-state="closing"` and is `inert`, so a row
cannot be clicked on its way out.

- **Reduced motion** — no animation in either direction; the list appears and
  disappears instantly and the close is synchronous again. Its visibility never
  depended on the animation, so nothing is lost.
- **Touch and coarse pointers** — unchanged; neither direction is pointer-gated
  and both play identically on touch.
- **Committing or dismissing is still immediate.** `value`, `onValueChange`,
  `onSelect` and `aria-expanded` all settle in the tick you act; only the list's
  removal from the DOM waits for the fade. A second Escape inside that window is
  not swallowed by the list already leaving — it reaches whatever sits
  underneath.

## Implementation Notes

- **Arrowing highlights a row; it does not preview into the field.** This
  is a deliberate choice between two options: let the arrow keys write the
  highlighted suggestion into the visible text as a live preview, or leave
  the field alone and only move `aria-activedescendant` plus the row's own
  highlight. Autocomplete does the second — the safer of the two, since the
  first means every arrow press has to remember and be able to restore
  whatever the user had actually typed the moment they stop arrowing (on
  Escape, on blur, on typing again). By never writing into the field in the
  first place, there is nothing to restore: **Escape's entire job is
  closing the panel**, because the visible text was never touched by
  navigation to begin with. `Enter` and a row click are the only two things
  that ever commit a suggestion into `value`.
- **Any text is a valid value — there is no resolution step.** Unlike
  `Combobox`, blur never rewrites what the user typed. A field left with
  text matching no suggestion just... keeps that text; there was never
  anything to fall back to.
- **No matches means no panel**, not an empty-state message. Unlike
  `Combobox` (a closed set, where showing "no options match" is useful
  information about the whole vocabulary), an open field with zero
  suggestions has nothing useful to say — the user can simply keep typing
  whatever they want. The panel closes itself if `suggestions` changes out
  from under it while open and leaves nothing left to show.
- **The active row and `aria-activedescendant` are the whole keyboard
  story.** Focus never leaves the input; there is no focus trap on the
  panel, unlike `Popover`. Rows are real `<button type="button">`s (a
  `<div role="listbox">`, not a `<ul>`, since a button is not a permitted
  child of `<ul>`) kept out of the tab sequence with `tabindex="-1"`, with
  `onmousedown` calling `preventDefault()` so a click never blurs the input
  a beat before its own `onclick` commits the suggestion.
- **The live region announces a count, not the contents.** A polite
  `role="status"` region — always mounted, whether or not the panel is
  open, the same pattern `ComposerCommandMenu`'s announcement uses —
  reports "N suggestions" as the list changes, never the suggestion text
  itself, so fast typing doesn't turn into a screen reader narrating every
  keystroke's worth of rows.
- **Filtering and navigation share one navigation core.** Matching is a
  fixed case-insensitive substring on each suggestion (there is no `filter`
  prop here, unlike `Combobox` — an open field has no vocabulary whose
  matching semantics need customizing); keyboard movement goes through the
  shared `_internals/listbox.svelte.ts` contract, the same one `Select`,
  `Combobox` and `TimePicker` consume.
- `getField()` (from the shared `_internals/field.svelte.ts` context) is
  `undefined` outside a `FormField`. Every context-sensitive value —
  `controlId`, `aria-describedby`, `aria-invalid`, `required`, `disabled` —
  falls back to this component's own prop of the same name in that case, so
  the control never throws and never renders unlabelled just because there
  is no surrounding `FormField`.
