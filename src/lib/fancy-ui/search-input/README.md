# SearchInput

A pill-shaped text field for search — a leading icon, an optional debounced
`onSearch`, and a clear button that only exists once there's something to
clear.

## Components

- `SearchInput` - A native `<input type="search">` wrapped in a styled field
  surface, with `aria-invalid`/`aria-describedby` wired to a surrounding
  `FormField` when there is one

## Usage

```svelte
<script>
	import { SearchInput } from "fancy-ui-svelte";

	let query = $state("");
</script>

<SearchInput bind:value={query} placeholder="Search components" onSearch={(v) => console.log(v)} />
```

Debounce a live-filtering search instead of waiting for Enter:

```svelte
<SearchInput bind:value={query} debounceMs={300} onSearch={runSearch} />
```

Inside a `FormField`, drop the `id`/`invalid` wiring entirely — the field
context supplies `controlId`, `aria-describedby`, `aria-invalid`, `required`
and `disabled`:

```svelte
<FormField label="Find a component">
	<SearchInput bind:value={query} />
</FormField>
```

## Props

| Prop            | Type                       | Default    | Description                                                                            |
| --------------- | -------------------------- | ---------- | -------------------------------------------------------------------------------------- |
| `value`         | `string`                   | `""`       | Current value; bindable                                                                |
| `onValueChange` | `(value: string) => void`  | —          | Called with the new value on every input event                                         |
| `onSearch`      | `(value: string) => void`  | —          | Fired on Enter, and on debounced settle when `debounceMs` is set                       |
| `placeholder`   | `string`                   | `"Search"` | Shown while the field is empty                                                         |
| `debounceMs`    | `number`                   | `0`        | Delay before a settled value fires `onSearch` on its own; `0` disables debouncing      |
| `disabled`      | `boolean`                  | `false`    | Blocks focus and typing; excluded from form submission                                 |
| `readonly`      | `boolean`                  | `false`    | Blocks typing and clearing but stays focusable and is still submitted, unlike disabled |
| `required`      | `boolean`                  | `false`    | Native `required`                                                                      |
| `invalid`       | `boolean`                  | `false`    | Drives the error border and `aria-invalid`                                             |
| `id`            | `string`                   | —          | Element id                                                                             |
| `name`          | `string`                   | —          | Native `name`, read on form submission                                                 |
| `label`         | `string`                   | —          | Accessible name — for a control with no visible Label next to it                       |
| `clearable`     | `boolean`                  | `true`     | Renders a clear button once there is something to clear                                |
| `class`         | `string`                   | —          | Additional CSS classes, merged onto the field surface, not the bare `<input>`          |
| `ref`           | `HTMLInputElement \| null` | `null`     | Bindable element reference                                                             |

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

Set `--ft-accent` higher up the tree to retint the focus ring beneath it —
the same variable `Input`, `Textarea`, `Checkbox` and `Toggle` all read.

## Implementation Notes

- **`type="search"`, not `type="text"`.** It maps to the `searchbox`
  accessibility role instead of a plain textbox, and it labels a mobile
  keyboard's return key "search" — a real win, since Enter already fires
  `onSearch`. The tradeoff: some browsers (Chrome, Safari, Edge) draw their
  own native clear "x" once the field has text. That native control is
  suppressed in this component's `<style>` block so there is exactly one
  clear affordance, this component's own, not two competing ones.
- **Debouncing.** `debounceMs={0}` (the default) schedules nothing at all —
  `onSearch` only ever fires from Enter. Set `debounceMs` above `0` to also
  fire `onSearch` once typing settles. Enter always cancels a debounce still
  in flight, so a settle can never report the same value a second time. The
  pending timer is cleared on unmount, so a component that's gone can never
  fire a stale search.
- **Escape.** Pressing Escape while the field has content clears it — the
  platform convention for search fields — and the keydown event's
  propagation is stopped in that case, so an ancestor's own Escape-to-close
  listener (a surrounding popover or dialog, say) never sees it. Escape on an
  already-empty field is left alone: nothing to clear, so the key bubbles
  normally and a surrounding overlay can still close on it.
- **The clear button** only renders once `clearable` is true and the field
  has content; it never renders while `readonly`, since clearing is a
  value-changing action and a readonly field blocks those the same way it
  blocks typing. Activating it also returns focus to the input — with the
  button gone the instant the field is empty, a click that left focus behind
  would strand it on a node no longer in the DOM.
- `getField()` (from the shared `_internals/field.svelte.ts` context) is
  `undefined` outside a `FormField`. Every context-sensitive value —
  `controlId`, `aria-describedby`, `aria-invalid`, `required`, `disabled` —
  falls back to this component's own prop of the same name in that case.
- `SearchInput` is a real, labelable `<input>`, so `FormField`'s `Label`
  resolves `for={controlId}` and the native `for`/`id` pairing does the rest —
  no `aria-labelledby` needed.
- The visual field surface — border, background, radius, focus ring — lives
  on the wrapping `<div>`, not the bare `<input>` inside it, since the icon
  and the clear button share that same row. The `class` prop merges onto that
  wrapper, and the focus ring reacts through `:focus-within` rather than the
  input's own `:focus-visible`, so focusing the input still lights up the
  whole field.
