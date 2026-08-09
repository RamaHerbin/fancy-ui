# Label

A form label: `font-size: 13px`, `font-weight: 500`, and a decorative
required asterisk. Standalone it just needs `for`; inside a `FormField` it
resolves both `for` and the required state on its own.

## Usage

```svelte
<script lang="ts">
	import { Label } from "fancy-ui-svelte";
</script>

<div class="flex flex-col gap-1.5">
	<Label for="email" required>Email</Label>
	<input id="email" type="email" required />
</div>
```

Inside a `FormField`, skip `for` and `required` entirely — a `Label` reads
both off the surrounding context:

```svelte
<script lang="ts">
	import { Label, FormField } from "fancy-ui-svelte";
</script>

<FormField required>
	{#snippet children()}
		<Label>Display name</Label>
		<input type="text" />
	{/snippet}
</FormField>
```

This is also the escape hatch for label content beyond `FormField`'s own
`label` string prop: skip that prop and render a `Label` yourself as part of
`children`, with whatever markup you need inside it.

## `for` vs. `aria-labelledby` — one sentence

Inside a `FormField`, `Label` always renders both a `for` (pointing at
`controlId`) and its own `id` (`FormField`'s `labelId`) on the same
`<label>` element: **a control whose root is a native labelable element
(button, input, meter, output, progress, select, textarea) uses `for`; a
control whose root is anything else — a `<div role="radiogroup">`, any
custom widget — cannot be targeted by `for` at all and must read
`getField()?.labelId` itself to set `aria-labelledby` on its own root.**
`Label` doesn't need to know which kind of control it's labelling — it
always carries both, and each control uses whichever one actually works for
its own root. Full reasoning in `FormField`'s README.

## The context precedence

**A surrounding `FormField`'s context always wins over `Label`'s own
`for`/`required` props.** This is the same rule every control in this wave
follows for its own `id`/`required`/`disabled` — see `FormField`'s README.
The reasoning is identical: `FormField` exists specifically so a caller never
wires `for` by hand, and a context that only won when the caller happened to
leave its own prop unset would make the two disagree silently the moment
someone passed one "just in case". A plain prop only matters when there is no
`FormField` above `Label` at all.

## Props

| Prop       | Type                       | Default | Description                                                                          |
| ---------- | -------------------------- | ------- | ------------------------------------------------------------------------------------ |
| `for`      | `string`                   | —       | Explicit target id. Inside a `FormField`, the field's own control id wins            |
| `required` | `boolean`                  | `false` | Renders the required asterisk. Inside a `FormField`, the field's own `required` wins |
| `children` | `Snippet`                  | —       | The label text/content                                                               |
| `class`    | `string`                   | —       | Additional CSS classes                                                               |
| `ref`      | `HTMLLabelElement \| null` | `null`  | Bindable element reference                                                           |

## Implementation notes

- The asterisk is purely decorative: it is marked `aria-hidden="true"`, so a
  screen reader announces "required" from the control's own
  `required`/`aria-required` attribute, never from hearing a star read aloud.
- `resolvedFor`/`resolvedRequired` are `$derived` reads of
  `getField()?.controlId ?? for` and `getField()?.required ?? required` —
  `Label` never throws or renders unlabelled outside a `FormField`, it just
  falls back to its own props.
- The rendered `<label>` also carries `id={getField()?.labelId}` — undefined
  (so no `id` attribute at all) outside a `FormField`, since nothing needs to
  reach a standalone `Label` that way. There is no `id` prop on `Label`
  itself for this; it is purely a context read, the same as `for` and
  `required`.
