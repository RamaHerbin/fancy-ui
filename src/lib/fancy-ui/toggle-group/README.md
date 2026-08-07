# ToggleGroup

A row (or column) of toggle buttons where the arrow keys move a single roving
tab stop instead of tabbing through every item — for a segmented control like
text alignment, a view switcher, or a set of independent formatting marks.

## Components

- `ToggleGroup` — the rail: owns the selection, publishes it through context
- `ToggleGroupItem` — one button in the rail: reads the selection and the
  roving-focus position, and never needs to be told either directly

## Usage

```svelte
<script>
	import { ToggleGroup, ToggleGroupItem } from "fancy-ui-svelte";

	let alignment = $state("left");
</script>

<ToggleGroup bind:value={alignment} label="Text alignment">
	<ToggleGroupItem value="left" label="Align left">⇤</ToggleGroupItem>
	<ToggleGroupItem value="center" label="Align center">↔</ToggleGroupItem>
	<ToggleGroupItem value="right" label="Align right">⇥</ToggleGroupItem>
</ToggleGroup>
```

`type="single"` (the default) keeps at most one value active, and `value` is
a plain string. Switch to `type="multiple"` for independent on/off marks and
`value` becomes an array:

```svelte
<script>
	import { ToggleGroup, ToggleGroupItem } from "fancy-ui-svelte";

	let marks = $state(["bold"]);
</script>

<ToggleGroup type="multiple" bind:value={marks} label="Formatting">
	<ToggleGroupItem value="bold" label="Bold"><strong>B</strong></ToggleGroupItem>
	<ToggleGroupItem value="italic" label="Italic"><em>I</em></ToggleGroupItem>
	<ToggleGroupItem value="underline" label="Underline">
		<span class="underline">U</span>
	</ToggleGroupItem>
</ToggleGroup>
```

Or handle the change yourself instead of binding, with `onValueChange` — it
is called with a string for `type="single"` and an array for
`type="multiple"`, matching whatever `value` would be.

## The context contract

`ToggleGroup` publishes one object under a module-private key; every
`ToggleGroupItem` reads it with `getContext`. That is the whole reason an
item only ever takes `value`, `disabled` and `label` — the selection, the
size, the orientation and the roving-focus position are already in scope.

```ts
interface ToggleGroupContext {
	readonly type: "single" | "multiple";
	readonly value: string[]; // always an array internally, whatever `type` says
	readonly disabled: boolean;
	readonly size: "sm" | "md" | "lg";
	readonly orientation: "horizontal" | "vertical";
	isSelected(itemValue: string): boolean;
	toggle(itemValue: string): void;
	register(itemValue: string): void;
	unregister(itemValue: string): void;
	readonly focusedValue: string | null;
	focus(itemValue: string): void;
	move(from: string, delta: number): void;
	moveToEdge(edge: "first" | "last"): void;
}
```

An item mounted outside a `ToggleGroup` degrades instead of throwing: it
renders as a plain, always-tabbable, permanently-unselected button, and a
click on it is a no-op — there is no group to tell.

## Keyboard model

This is the part worth reading closely; it is the whole point of the
component.

- **Roving tabindex.** Exactly one item carries `tabindex="0"` at a time —
  every other item is `tabindex="-1"`. Tab moves into and out of the group
  in one stop each way, never through every item.
- **Both arrow-key pairs work in both orientations.** Right/Down move
  forward and Left/Up move backward, wrapping at either end, regardless of
  whether `orientation` is `"horizontal"` or `"vertical"`. The orientation
  only decides the primary reading direction and the flex axis — a user
  reaching for the "wrong" pair is never stranded.
- **Home and End** jump to the first and last _enabled_ item.
- **Disabled items are invisible to the keyboard model.** The arrows step
  over them, they never receive `tabindex="0"`, and the native `disabled`
  attribute keeps them out of the click and focus paths entirely.
- **Moving focus moves DOM focus.** `ArrowRight` et al. call `.focus()` on
  the real button, not just an internal pointer — a screen reader and a
  sighted keyboard user see the same thing.
- **The arrow sequence follows what is actually on screen**, not the order
  items happened to register in. `ToggleGroup` re-reads the live DOM at the
  moment a key is pressed, so an item that mounts out of order, or one a
  keyed `{#each}` moves to a new position after the fact, is correct on the
  very next key press.

## Props

### ToggleGroup

| Prop            | Type                                  | Default        | Description                                                     |
| --------------- | ------------------------------------- | -------------- | --------------------------------------------------------------- |
| `type`          | `"single" \| "multiple"`              | `"single"`     | Whether one item can be active at a time, or several            |
| `value`         | `string \| string[]`                  | `""`           | The active value(s), bindable — shape follows `type`            |
| `onValueChange` | `(value: string \| string[]) => void` | —              | Called with the new value, shaped to match `type`               |
| `disabled`      | `boolean`                             | `false`        | Disables every item in the group                                |
| `size`          | `"sm" \| "md" \| "lg"`                | `"md"`         | Sizes every item                                                |
| `orientation`   | `"horizontal" \| "vertical"`          | `"horizontal"` | The rail's stacking axis — both arrow-key pairs work either way |
| `label`         | `string`                              | —              | Accessible name for the group                                   |
| `children`      | `Snippet`                             | —              | The `ToggleGroupItem`s                                          |
| `class`         | `string`                              | —              | Additional CSS classes                                          |
| `ref`           | `HTMLDivElement \| null`              | `null`         | Bindable element reference                                      |

### ToggleGroupItem

| Prop       | Type                        | Default | Description                                                        |
| ---------- | --------------------------- | ------- | ------------------------------------------------------------------ |
| `value`    | `string`                    | —       | This item's value. Required                                        |
| `disabled` | `boolean`                   | `false` | Disables just this item, independent of the group's own `disabled` |
| `label`    | `string`                    | —       | Accessible name, for icon-only content. Also the text fallback     |
| `children` | `Snippet`                   | —       | The item's content, typically a glyph or a short label             |
| `class`    | `string`                    | —       | Additional CSS classes                                             |
| `ref`      | `HTMLButtonElement \| null` | `null`  | Bindable element reference                                         |

## Theming

The pressed surface uses the shared `bg-secondary`/`text-secondary-foreground`
tokens, so it follows whatever a consumer's theme already says for those. The
focus ring has no semantic token in the app's theme layer, so it falls back
to a `light-dark()` accent pair local to the component — the same shape
`Toggle` uses:

```css
.my-toolbar {
	--ft-accent: oklch(0.55 0.2 300);
}
```

Set `--ft-accent` higher up the tree to retint the focus ring on every
`ToggleGroupItem` beneath it.

## Implementation Notes

- `value` is normalised to a `string[]` through `toArray`, which does branch
  on `type`: a `"single"` group takes at most the first entry even if it is
  handed an array (leftover state from a `type` prop that used to be
  `"multiple"`, say), so it can never end up with two items reading
  `aria-pressed="true"` at once. `toggle` calls `toArray` itself, on the raw
  `value` prop, rather than reading the `selected` derived it would otherwise
  share with rendering — the same function call, on the same line as the
  write that follows it, needs the prop as it stands right now. A consumer
  chained to `value` through a second `bind:` hop (a wrapper component
  forwarding its own bindable, the way this compound's own test harness
  does) can still be looking at the derived's pre-write snapshot at that
  exact point in the tick, and `toggle` cannot afford to decide select-vs-
  deselect off a stale read of its own target. `selected` itself stays a
  `$derived` for every purely reactive read (rendering `aria-pressed`, the
  `focusedValue` fallback) where that staleness risk does not apply.
- `type="single"` lets clicking the already-active item clear the selection
  outright, rather than treating a second click as a no-op — the one state a
  native radio group cannot represent, and one this component makes
  reachable on purpose.
- A click moves the roving tab stop and DOM focus to the item clicked,
  explicitly — it does not rely on the browser's own click-to-focus behaviour
  for a `<button>`, which macOS Safari does not do by default. Without the
  explicit call, a Safari mouse user could click "Center" and have Tab still
  leave from wherever the roving position last was, not from what they just
  selected.
- The roving-focus position is tracked as a value, not an index, and
  resolved through a getter that always re-reads the live registry: if the
  item that currently holds it unmounts, the very next read falls back to
  the selected item (if any) or the first registered one, so the group can
  never end up with zero tabbable items. With every item disabled, the
  registry stays empty and the fallback is `null` — no item is tabbable,
  matching a `<fieldset disabled>`, and `move`/`moveToEdge` no-op instead of
  indexing into an empty list.
- Registration itself only records _that_ an item exists and is enabled — it
  is deliberately not used to decide arrow-key order. `move`/`moveToEdge`
  query `ToggleGroupItem`'s own DOM nodes directly, in whatever order they
  actually sit in, at the moment a key is pressed. That is what keeps the
  keyboard model correct under a reordering `{#each}`, which registration
  order alone could not guarantee.
- Sizes are exact pixel geometry (heights `26px`/`30px`/`34px`, radii
  `4px`/`6px`/`8px`) with a `min-width` rather than a fixed `width`, so a
  glyph settles at the mockup's square footprint while a text label like
  "Week" still gets room to breathe.
- The rail's fill is `bg-background`, not `bg-muted`: this app's dark theme
  has `--muted` _lighter_ than `--card`, so a muted fill on a card-nested
  rail would read as raised rather than the mockup's recessed strip.
  `--background` is the darkest token in dark mode and ties `--card` in
  light mode, so the rail can only ever read as recessed or flush with its
  surroundings — never inverted.
- Every item still owns its own `disabled` prop on top of the group's — a
  group that is otherwise enabled can disable one option without disabling
  the rest.
