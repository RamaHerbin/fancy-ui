# RadioGroup

A set of mutually exclusive options — for picking exactly one choice out of a
short, fully visible list, like a shipping method or a plan tier.

## Components

- `RadioGroup` — the list: owns the selection, publishes it through context
- `RadioGroupItem` — one option: a real `<input type="radio">` restyled to
  match the design, wrapped in a `<label>`

## Usage

```svelte
<script>
	import { RadioGroup, RadioGroupItem } from "fancy-ui-svelte";

	let plan = $state("starter");
</script>

<RadioGroup bind:value={plan} label="Plan">
	<RadioGroupItem value="starter" label="Starter" />
	<RadioGroupItem value="team" label="Team" />
	<RadioGroupItem value="enterprise" label="Enterprise" />
</RadioGroup>
```

Or handle the change yourself instead of binding, with `onValueChange` — and
either way, `value` also works as a plain, non-bound prop plus that callback,
if the caller would rather own the state itself:

```svelte
<script>
	import { RadioGroup, RadioGroupItem } from "fancy-ui-svelte";

	function onValueChange(value) {
		console.log("plan is now", value);
	}
</script>

<RadioGroup value="starter" {onValueChange} label="Plan">
	<RadioGroupItem value="starter" label="Starter" />
	<RadioGroupItem value="team" label="Team" />
	<RadioGroupItem value="enterprise" label="Enterprise" />
</RadioGroup>
```

## Why native radios, and what that buys for free

Every `RadioGroupItem` renders a real `<input type="radio">`, restyled — not
a `<div role="radio">` standing in for one. All the items in one `RadioGroup`
share a `name`, which is the entire reason to prefer native here: the browser
gives the roving tab stop, the arrow-key navigation, wrapping at either end,
skipping disabled items, and form submission, all for free, correctly, on
every platform. None of that is reimplemented in JS.

Concretely, the browser's own rule (unrelated to this component's code) is:
while nothing in the group is checked, the _first_ radio is the tab stop;
once one is checked, _that one_ becomes the tab stop and every other item
drops out of the Tab sequence (arrow keys still move between them, and still
select as they go). `RadioGroupItem` never authors a `tabindex` of its own —
doing so would fight that default instead of getting it for free.

## The context contract

`RadioGroup` publishes one object under a module-private key; every
`RadioGroupItem` reads it with `getContext`. Unlike a hand-rolled selection
control, this context does not track roving focus or arrow-key order — the
browser already owns both, given a shared `name` and no authored `tabindex`.
It only carries what the browser cannot infer on its own:

```ts
interface RadioGroupContext {
	readonly name: string; // shared by every item's native radio
	readonly value: string; // "" when nothing is selected
	readonly disabled: boolean;
	readonly required: boolean;
	readonly invalid: boolean;
	isSelected(itemValue: string): boolean;
	select(itemValue: string): void;
}
```

An item mounted outside a `RadioGroup` degrades instead of throwing: it
renders as a plain, unchecked, standalone radio with no shared `name`, and a
change on it is a no-op — there is no group to tell.

## Standalone or inside a FormField

`RadioGroup` works on its own — pass `label` for its accessible name, and
`invalid`/`required`/`disabled` as plain props. Wrapped in a `FormField`
instead, the field's context wins for the group's id, `aria-describedby`,
`aria-invalid`, `aria-required` and `disabled`, so nothing needs wiring by
hand:

```svelte
<script>
	import { FormField } from "fancy-ui-svelte";
	import { RadioGroup, RadioGroupItem } from "fancy-ui-svelte";

	let method = $state("");
</script>

<FormField
	label="Shipping method"
	required
	error={method === "" ? "Choose a shipping method to continue." : undefined}
>
	<RadioGroup bind:value={method}>
		<RadioGroupItem value="standard" label="Standard — 5 to 7 days" />
		<RadioGroupItem value="express" label="Express — 2 days" />
	</RadioGroup>
</FormField>
```

`RadioGroup`'s own `label` prop is redundant in that case — leave it unset.
The naming here is worth being precise about, because it is easy to get
backwards: the group's root is a `<div role="radiogroup">`, not one of the
elements `<label for>` can target (button, input, meter, output, progress,
select, textarea) — an ARIA role does not add it to that list. So `FormField`
does **not** label the group through `controlId`/`for` the way it labels a
plain `<input>`. It labels the group through `aria-labelledby`, pointed at
the id of the `<label>` element `FormField` actually rendered
(`FieldContext.labelId`) — `controlId` only ever becomes the group's own
`id`, which matters for `aria-describedby` and nothing about naming.

If a `FormField` renders no label of its own (its `label` prop is unset),
`labelId` is `undefined` and `RadioGroup` falls back to its own `label`
prop instead — same "context wins, own prop is the standalone fallback"
rule every other field-derived value here follows, just applied to
`aria-labelledby`/`aria-label` instead of a plain boolean.

## Props

### RadioGroup

| Prop            | Type                         | Default      | Description                                                               |
| --------------- | ---------------------------- | ------------ | ------------------------------------------------------------------------- |
| `value`         | `string`                     | `""`         | The selected value, bindable — `""` means nothing is selected             |
| `onValueChange` | `(value: string) => void`    | —            | Called with the new value whenever the selection changes                  |
| `name`          | `string`                     | generated    | Shared `name` for the native radios — generated per instance when unset   |
| `disabled`      | `boolean`                    | `false`      | Disables every item in the group                                          |
| `required`      | `boolean`                    | `false`      | Marks the group required for native form validation                       |
| `invalid`       | `boolean`                    | `false`      | Marks the group invalid — sets `aria-invalid`                             |
| `orientation`   | `"horizontal" \| "vertical"` | `"vertical"` | The list's stacking axis                                                  |
| `label`         | `string`                     | —            | Accessible name, standalone — a FormField with its own label wins instead |
| `children`      | `Snippet`                    | —            | The `RadioGroupItem`s                                                     |
| `class`         | `string`                     | —            | Additional CSS classes                                                    |
| `ref`           | `HTMLDivElement \| null`     | `null`       | Bindable element reference                                                |

### RadioGroupItem

| Prop       | Type                       | Default | Description                                                          |
| ---------- | -------------------------- | ------- | -------------------------------------------------------------------- |
| `value`    | `string`                   | —       | This item's value. Required                                          |
| `disabled` | `boolean`                  | `false` | Disables just this item, independent of the group's own `disabled`   |
| `label`    | `string`                   | —       | Visible label text. Also the fallback content, and the fallback name |
| `children` | `Snippet`                  | —       | Custom content rendered in place of `label`                          |
| `class`    | `string`                   | —       | Additional CSS classes, merged onto the wrapping `<label>`           |
| `ref`      | `HTMLInputElement \| null` | `null`  | Bindable element reference, to the native `<input>`                  |

## Theming

The checked ring/dot colour has no semantic token in the app's theme layer,
so it falls back to a `light-dark()` accent pair local to the component —
the same shape `Toggle` and `Button` use:

```css
.my-form {
	--ft-accent: oklch(0.55 0.2 300);
}
```

Set `--ft-accent` higher up the tree to retint every `RadioGroupItem`
beneath it. The resting ring and the invalid tint use the app's own
`border-input`/`border-destructive` tokens directly, unlike the accent —
those already have a conventional shadcn-style name a consumer's theme is
expected to define.

## Implementation Notes

- `name` is generated with Svelte's `$props.id()`, not `_internals/id.js`'s
  `uid()`. `uid()` is client-only by design — its counter can't agree
  between server and client — so a `uid()`-based name would leave every
  radio without a `name` at all until hydration, and two same-page groups
  would briefly share nothing (each equally missing) rather than staying
  distinct from the very first paint. `$props.id()` gives the same
  one-generator-per-instance guarantee safely during SSR — it is how
  `FormField`, this same wave's other id-generating form primitive, solves
  the identical problem, for the identical reason.
- The checked dot is a `::after` pseudo-element on the input itself, not a
  second DOM node — the native input stays the only focusable, checkable
  element. It is also a shape change, not only a colour change, so "checked"
  still reads without colour.
- `RadioGroupItem` never sets `tabindex`. That silence is deliberate — see
  "Why native radios" above — and is covered by a regression test, because
  wrapping the input in a `<label>` is exactly the kind of change that can
  quietly reintroduce one.
- Clicking the already-selected item is a no-op: the browser only fires
  `change` when a radio's checked state actually changes, so there is
  nothing for `RadioGroupItem` to guard against and no `onValueChange` call
  to suppress. This is the one thing a native radio group cannot do that
  `ToggleGroup`'s hand-rolled single-select can (deselect on a second
  click) — a real constraint of the format, not an oversight here.
- `required` is mirrored onto every item's native `required` attribute, not
  just the group's `aria-required` — setting `required` on any radio in a
  same-`name` group makes the whole group required for native constraint
  validation, so mirroring it onto all of them keeps that native behaviour
  correct regardless of which item a caller happens to inspect.
- Every item still owns its own `disabled` independent of the group's —
  a group that is otherwise enabled can disable one option without
  disabling the rest, and the browser's roving tab stop skips it either way.
- `aria-labelledby={field?.labelId}` and `aria-label={field?.labelId ? undefined : label}`
  are deliberately an either/or pair, never both at once — `aria-labelledby`
  outranks `aria-label` in accessible-name computation regardless, but
  rendering both would leave a second, misleading attribute in the DOM for
  no benefit. `field?.labelId` alone decides which one applies; see
  "Standalone or inside a FormField" above for why `controlId` cannot do
  this job here the way it does for a plain `<input>`.
