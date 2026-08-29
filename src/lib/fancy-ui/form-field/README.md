# FormField

Wraps a single control with a label, help/error text, and the id plumbing
that lets a screen reader announce all of it correctly — without the caller
wiring `for`, `aria-describedby`, `aria-invalid`, `aria-required` or
`disabled` by hand. Every other control in this wave (`Input`, `Textarea`,
`Checkbox`, ...) reads its identity off `FormField`'s context instead of
taking those as plain props alone.

## Usage

```svelte
<script lang="ts">
	import { FormField, Input } from "fancy-ui-svelte";

	let email = $state("");
</script>

<FormField label="Email" description="We'll only use this to send your receipt.">
	<Input bind:value={email} type="email" placeholder="you@example.com" />
</FormField>
```

An error replaces the help text — it never stacks under it — and marks the
field invalid:

```svelte
<FormField label="Username" required error="Minimum 3 characters.">
	<Input bind:value={username} />
</FormField>
```

`valid` adds a decorative checkmark next to the help text, and publishes
`valid` on the field context for a control that wants to draw its own
success look. `error` always wins if both are set:

```svelte
<FormField label="Email" description="Used for sign-in and notifications." valid>
	<Input bind:value={email} />
</FormField>
```

For label content beyond a plain string, skip the `label` prop and render a
`Label` yourself as part of `children` — it resolves `for` and `required`
off this same context on its own, so there is nothing extra to wire. See the
`Label` README.

```svelte
<FormField required>
	{#snippet children()}
		<Label>Display name</Label>
		<Input />
	{/snippet}
</FormField>
```

## The context contract

`FormField` publishes one object under a module-private key
(`_internals/field.svelte.ts`); every control in this wave reads it with
`getField()`.

```ts
interface FieldContext {
	readonly controlId: string;
	readonly labelId?: string; // optional — see "labelId is for a control whose root isn't labelable" below
	readonly describedBy: string | undefined; // help/error ids, space-joined, or undefined
	readonly invalid: boolean;
	readonly valid?: boolean; // optional — see "valid is optional, on purpose" below
	readonly required: boolean;
	readonly disabled: boolean;
}
```

A control mounted outside a `FormField` gets `undefined` back from
`getField()` and must fall back to its own props — it must never throw or
render unlabelled. `Label` follows the same rule.

**One-sentence rule for which id to use:** a control whose root is a native
labelable element (button, input, meter, output, progress, select,
textarea) uses `controlId` with a native `for`/`id` association, exactly as
above; a control whose root is anything else — a `<div role="radiogroup">`,
a `<div role="group">`, any custom widget — cannot be targeted by `for` at
all (the HTML spec's labelable-element list is fixed; an ARIA role does not
extend it), and must set `aria-labelledby={field.labelId}` on its root
instead. This is additive, not a replacement for `controlId` — a labelable
control still prefers `for`, since it is the stronger, more broadly
supported mechanism where it applies.

```svelte
<!-- Inside a group-shaped control's own template — its root can't use `for` -->
<script lang="ts">
	const field = getField();
</script>

<div role="radiogroup" aria-labelledby={field?.labelId} aria-describedby={field?.describedBy}>
	<!-- ... -->
</div>
```

## The precedence rule — context wins

**Whenever a control sits inside a `FormField`, the context's `controlId`,
`describedBy`, `invalid`, `valid`, `required` and `disabled` win over that
control's own `id`/`required`/`disabled` props, unconditionally — not
"context wins unless the caller also passed a prop", genuinely always.**
Every control in this wave, and `Label`, follows this same rule; document it
the same way wherever a component reads `getField()`.

The reasoning: `FormField` exists specifically so a caller never has to wire
ids and aria attributes by hand. A precedence that only applied when the
caller happened to leave the control's own prop unset would make the two
silently disagree the moment someone passed one defensively — `required` on
both the field and the control, say — and there would be no way to tell
which one actually won without reading the DOM. Always-context is simple to
state, simple to test, and never surprises a caller who forgot they had also
set the control's own prop.

## Props

| Prop          | Type                     | Default | Description                                                                                   |
| ------------- | ------------------------ | ------- | --------------------------------------------------------------------------------------------- |
| `label`       | `string`                 | —       | Label text — the common case. For custom label markup, render a `Label` in `children` instead |
| `description` | `string`                 | —       | Help text under the control, replaced by `error` while the field is invalid                   |
| `error`       | `string`                 | —       | Error text. Setting it marks the field invalid and replaces the help text                     |
| `valid`       | `boolean`                | `false` | Decorative checkmark next to the help text; `error` always wins if both are set               |
| `required`    | `boolean`                | `false` | Marks the field required: the label gets an asterisk, the control gets `aria-required`        |
| `disabled`    | `boolean`                | `false` | Disables the field: reaches the wrapped control through context                               |
| `id`          | `string`                 | —       | Opts out of the generated id. `description`/`error` ids are suffixes of this same value       |
| `children`    | `Snippet`                | —       | The control                                                                                   |
| `class`       | `string`                 | —       | Additional CSS classes, merged onto the root                                                  |
| `ref`         | `HTMLDivElement \| null` | `null`  | Bindable reference to the root element                                                        |

## Motion

- Help text and error text each grow and fade in over 150 ms when they
  appear, so a message arriving under a field the user is typing in reads as
  "this just changed" rather than as a layout jolt. Only `opacity` and
  `transform` animate.
- The checkmark next to valid help text gets 80 ms instead — it is one
  character wide, and a glyph-scale change only needs a glyph-scale beat.
- **Messages animate in, never out.** The error and the description are the
  two branches of one `{#if}`, and each carries the id `aria-describedby`
  points at. An exit animation would leave a paragraph on screen for 150 ms
  after the control had already stopped describing it — a message a screen
  reader is no longer pointed at, still visible. With entrances only, the
  outgoing branch is gone in the same tick the incoming one mounts, so the
  wiring and the pixels never disagree.
- A field that renders with its message already present gets no entrance,
  and a field that renders already-valid does not pop its checkmark. Svelte
  skips a local intro on a block's first run, which is the behaviour you
  want: only a real change performs.
- **Reduced motion.** With `prefers-reduced-motion: reduce`, both entrances
  collapse to zero duration, which makes Svelte skip the animation outright
  rather than run a zero-length one. Every message and glyph still appears,
  still carries its id, still reaches `aria-describedby`.
- **Touch and coarse pointers.** Nothing here follows the pointer or depends
  on hover, so a coarse pointer behaves identically.

## Implementation notes

- **`describedBy` is derived, not registered.** It is recomputed on every
  read directly from whether the help/error paragraph is currently rendered
  — the same two flags (`hasDescription`/`hasError`) that gate the
  `{#if}` blocks drawing them. That keeps the id list honest without a
  separate mount/unmount bookkeeping step: DOM presence and the flag are the
  same read, in the same reactive pass, so a described-by id is never in the
  list while its element is missing, and never missing while its element is
  in the DOM — correctly during SSR too, not just after hydration. A
  `$effect`-based registration would add exactly that gap, since effects
  never run during SSR: the server-rendered help paragraph would ship
  without anything pointing at it until the client caught up.
- **Ids share one base.** A single per-instance seed — `id`, when given,
  otherwise a generated one — is suffixed for the control (`id` itself, or
  `<seed>-control`), the label (`<base>-label`), and both messages
  (`<base>-description`, `<base>-error`). Passing `id="username"` therefore
  makes `username-description` and `username-error` predictable without
  reading anything back off the component — useful if a control that isn't
  context-aware ever needs to wire itself up by hand, and how this
  component's own docs examples do it, since none of this wave's controls
  exist yet in the same tree this file lives in.
- **`labelId` is for a control whose root isn't labelable.** `<label for>`
  can only ever target button, input, meter, output, progress, select and
  textarea — that list is fixed by the HTML spec, and giving a `<div
role="radiogroup">` an ARIA role does not add it. `FormField`'s own
  `<Label>` (rendered from the `label` prop) still gets a real `for`
  pointing at `controlId`, unconditionally — that costs nothing and helps a
  labelable control. `labelId` is `Label`'s own rendered id, published
  separately so a group-shaped control's root can point its own
  `aria-labelledby` at it instead, which `for` structurally cannot reach.
  `undefined` while `FormField` renders no label of its own (`label` prop
  not given) — a control never gets an id pointing at nothing, the same
  invariant `describedBy` already keeps for help/error. A `Label` a caller
  hand-places inside `children` (the `label`-prop-skipping path above) is
  not reflected in `labelId`, since `FormField` cannot see it; that path is
  meant for a labelable control's custom markup, not a group-shaped one.
- **That seed comes from `$props.id()`, not `_internals/id.ts`'s `uid()`.**
  `uid()` throws outside the browser by design — its counter can't agree
  between server and client — and a `FormField` that only renders once JS
  has hydrated is not on the table for a form primitive. `$props.id()` gives
  the identical guarantee (one seed, collision-free suffixes across a whole
  page of fields) safely during SSR, and it is already how every other
  multi-id component in this codebase (`ReasoningPanel`,
  `ComposerCommandMenu`, `ToolCall`, ...) solves this exact problem.
- **Error replaces help text, never stacks under it.** The moment `error` is
  set, the help paragraph is not in the DOM at all — only the error id ever
  ends up in `describedBy` in that state, not both.
- **The error glyph is decoration.** The leading `✕` is `aria-hidden`; the
  text next to it is what actually says the field is invalid.
- **`valid`'s checkmark is decoration too, deliberately, not a message.**
  Unlike `error`, `valid` does not grow its own paragraph — it prefixes the
  existing help text with an `aria-hidden` `✓` (only when there is help text
  to prefix; with no `description`, `valid` is a no-op in the DOM, since a
  lone checkmark with nothing to attach "valid" to is exactly the
  meaningless-glyph problem this rule exists to avoid). The reasoning: an
  `error` message has to exist because it carries information specific to
  _why_ the field failed — a caller cannot omit it and lose nothing. A
  generic "this field is valid" message carries no comparable new
  information beyond what the help text (or the absence of an error) already
  says, so growing a second paragraph next to it would mostly be repetition
  competing for the same reading position `error` uses. If a given field's
  success genuinely needs its own sentence, pass that sentence as
  `description` itself — `valid` then just adds the checkmark on top of it.
  `field.valid` is still published on the context (optional — see below) for
  a control that wants to draw a fuller success treatment of its own, the
  way `Input` draws its own border colour off `field.invalid`.
- **`valid` is optional on `FieldContext`, not required, and that was a
  fix, not the original design.** It was added to the frozen five-field
  contract after `Input`, `NumberInput`, `RadioGroup`, `Slider` and
  `Textarea` had already been built and tested against it. Adding it as a
  required field broke every one of their hand-built `FieldContext` object
  literals under `svelte-check` — a required field is a breaking change to a
  contract other builders were already relying on, full stop, regardless of
  how the new field behaves at runtime. Making it optional fixed all of that
  without touching any of those five folders: `createFieldState`'s own
  output always populates it, so `FormField` and `Label` never see it
  missing; only a hand-built literal that predates this field does, and
  `undefined` there reads the same as "not valid" to a `field?.valid ?? false`
  read. Anyone adding a field to `FieldContext` in the future should default
  to optional for exactly this reason, unless every existing consumer is
  being updated in the same change.
