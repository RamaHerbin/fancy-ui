# TimePicker

A field that opens a floating listbox of time slots — generated at a
configurable step, keyboard-navigable, with the highlighted slot always
scrolled into view.

## Components

- `TimePicker` — the trigger button, exported.
- `TimePickerPanel` — the portalled slot listbox. Internal; not exported from
  `index.ts`, the same way `select/SelectPanel.svelte` isn't. It only ever
  mounts inside `TimePicker`'s own `{#if open}`.

## Usage

```svelte
<script lang="ts">
	import { TimePicker } from "fancy-ui-svelte";

	let time = $state<string | null>(null);
</script>

<TimePicker bind:value={time} label="Time" />
```

Or handle the change yourself instead of binding:

```svelte
<script lang="ts">
	import { TimePicker } from "fancy-ui-svelte";

	function onValueChange(value: string | null) {
		console.log("selected", value);
	}
</script>

<TimePicker {onValueChange} label="Time" />
```

A finer step, and a window of allowed slots:

```svelte
<script lang="ts">
	import { TimePicker } from "fancy-ui-svelte";

	let time = $state<string | null>(null);
</script>

<TimePicker bind:value={time} step={15} min="09:00" max="17:00" />
```

Display in 12-hour form without changing what the app reads or stores:

```svelte
<TimePicker bind:value={time} hour12 />
```

## Props

| Prop            | Type                              | Default           | Description                                                               |
| --------------- | --------------------------------- | ----------------- | ------------------------------------------------------------------------- |
| `value`         | `string \| null`                  | `null`            | The selected time, `"HH:mm"` 24-hour; bindable — see Implementation Notes |
| `onValueChange` | `(value: string \| null) => void` | —                 | Called with the new value whenever a slot is picked                       |
| `step`          | `number`                          | `30`              | Minutes between generated slots                                           |
| `min`           | `string`                          | —                 | Earliest selectable slot (`"HH:mm"`, inclusive)                           |
| `max`           | `string`                          | —                 | Latest selectable slot (`"HH:mm"`, inclusive)                             |
| `hour12`        | `boolean`                         | `false`           | Display only — 12-hour clock with AM/PM. The value stays `"HH:mm"`        |
| `disabled`      | `boolean`                         | `false`           | Blocks opening the panel; excluded from form submission                   |
| `required`      | `boolean`                         | `false`           | Marks the field required for the surrounding form                         |
| `invalid`       | `boolean`                         | `false`           | Drives the error border and `aria-invalid`                                |
| `id`            | `string`                          | —                 | Element id                                                                |
| `name`          | `string`                          | —                 | Native `name` — when set, a hidden input carries the `"HH:mm"` value      |
| `label`         | `string`                          | —                 | Accessible name — for a control with no visible Label next to it          |
| `placeholder`   | `string`                          | `"Select a time"` | Shown in the trigger while no time is selected                            |
| `locale`        | `string`                          | —                 | BCP 47 locale for slot and trigger-label formatting                       |
| `class`         | `string`                          | —                 | Additional CSS classes, merged onto the trigger button                    |
| `ref`           | `HTMLButtonElement \| null`       | `null`            | Bindable element reference to the trigger button                          |
| `sound`         | `boolean`                         | `false`           | Plays interface cues through the sound controller. See [Sound](#sound)    |

All of `disabled`, `required` and `invalid`, plus the element's `id`, are
overridden by a surrounding `FormField`'s own context.

## Sound

Set `sound` to opt into interface cues, off by default and silent until the
user has enabled sound in their own preferences:

```svelte
<TimePicker bind:value={time} sound />
```

`open` plays when the slot list opens from the trigger; `select` plays once
a slot commits — a row click, or Enter/Space on the active row — and changes
the value. Escape, an outside click, toggling the trigger shut, and
re-picking the slot already selected all play `close` instead, never both:
a commit is one cue, a dismiss is the other, never `select` followed by
`close` for the same pick. Arrow-key navigation and hovering a row only move
the highlight and stay silent.

## Theming

The accent border/halo, the selected slot's checkmark and the active/selected
row fill have no semantic token of their own beyond the shared
`bg-accent`/`text-accent-foreground` pair, and fall back to a `light-dark()`
pair local to the component:

```css
.my-form {
	--ft-accent: oklch(0.55 0.2 300);
}
```

Set `--ft-accent` higher up the tree to retint the trigger's focus ring and
the selected row's checkmark.

## Motion

The panel arrives and leaves on one bidirectional transition — the shared `fast`
rung, 150 ms in each direction, applied in JS (there is no `--ft-*` variable to
override it). It rises from a `0.92` scale floor on the out-curve and collapses
to `0.96` on the in-curve: leaving is a smaller gesture than arriving, and a
full-depth collapse on dismiss reads as the panel being sucked away rather than
simply closing.

The growth origin follows the side the panel was actually placed on — flipped
placements included — so it always appears to come out of the trigger rather
than out of its own centre, and to go back into it. Exposed as `data-side` /
`data-align` for consumers that want to key their own styling off the resolved
placement. While the panel is on screen it also carries `data-state="open"`; for
the length of the exit it carries `data-state="closing"` and is `inert`, so a
row cannot be clicked on its way out.

- **Reduced motion** — no animation in either direction; the panel appears and
  disappears instantly and the close is synchronous again. Visibility never
  depended on the animation.
- **Touch and coarse pointers** — unchanged; neither direction is pointer-gated.
- **Committing or dismissing is still immediate.** `value`, `onValueChange` and
  `aria-expanded` all settle in the tick you act; only the panel's removal from
  the DOM waits for the fade. A second Escape inside that window is not
  swallowed by the panel already leaving — it reaches whatever sits underneath.
  Reopening mid-fade reverses the exit rather than starting over.

## Implementation Notes

- **The value contract is `"HH:mm"`, 24-hour, always** — regardless of
  `hour12`. `hour12` only changes what `formatSlotLabel` renders in the
  trigger and in each row; `onValueChange`, `bind:value` and the hidden form
  input all still carry `"14:30"` whether `hour12` is `true` or `false`. This
  is the single most likely thing to trip up a consumer, so it is worth
  saying twice: **display and value are decoupled.** Proven end to end in
  `TimePicker.test.ts`, not just argued from reading the code: a real click
  on a row labelled in 12-hour form still commits the 24-hour string.
- **`min`/`max` can exclude every generated slot** (`min` after `max`, or a
  window narrower than `step`). This is reachable — the component does not
  validate one bound against the other — and the panel still opens rather
  than silently doing nothing on click; `TimePickerPanel` shows a plain "No
  times available." row instead of an empty listbox with no explanation.
- **Slot generation is anchored at `00:00`.** `step` minutes are added
  repeatedly (`00:00`, `00:{step}`, `00:{2×step}`, ...) until the next start
  would reach or pass midnight. A `step` that does not divide 60 or 1440
  evenly (45, for instance) is not special-cased — the grid simply ends with
  whatever gap is left before midnight rather than inserting a synthetic
  partial slot. `min`/`max` are applied as a filter over that same fixed
  grid: a bound that does not land exactly on a generated boundary excludes
  the slot straddling it rather than inserting a new one exactly at the
  bound. Both behaviours are covered in `time-utils.test.ts`.
- **A `value` that doesn't land on the grid** (set programmatically while
  `step` doesn't divide it evenly, say) still displays correctly in the
  trigger — formatting works on any valid `"HH:mm"` — and the panel opens
  with the _nearest_ slot at or after it highlighted (the last slot if the
  value is later than every one of them), rather than opening with nothing
  highlighted at all.
- **Slots are a real `role="listbox"`** with `role="option"` rows,
  `aria-selected` on the chosen one, and `aria-activedescendant` on the
  trigger pointing at whichever row is highlighted. Focus never moves off the
  trigger button — arrow keys, Home/End, and Enter are all handled by its own
  `onkeydown`, following the same combobox-with-listbox-popup split
  `select/Select.svelte` and `select/SelectPanel.svelte` use, down to reusing
  the same `_internals/listbox.svelte.ts` core for the move/wrap/edge
  mechanics (per-slot disabling is not part of this component's surface, so
  every slot is always enabled to that shared core). A **pointer** commit is
  the one path that can move focus off the trigger — pressing a row focuses
  the row, and the panel is portalled to `<body>`, so it has no focusable
  ancestor to hand focus back to once it unmounts. The commit puts focus on
  the trigger itself before closing, so a click leaves the tab order exactly
  where a keyboard commit does rather than stranding it on `<body>`.
- **The highlighted slot is scrolled into view the instant the panel opens**,
  not only on the next arrow press — `openPanel` calls the scroll explicitly
  after the DOM updates, rather than relying solely on the listbox core's
  `onActiveChange` callback, which only fires when the active index actually
  _changes_. A reopen that lands on the same index a previous session left
  active would otherwise skip the scroll and could open with the selection
  off-screen.
- **Escape closes without committing.** `TimePickerPanel`'s own
  `dismissable` action is the only Escape listener — there is no second one
  on the trigger. Because nothing in the trigger's own keydown handling
  writes `value` for any key other than Enter/Space, "Escape closes without
  changing the value" falls out for free rather than needing its own guard.
- **`aria-controls`** on the trigger is only ever present while the panel
  actually exists in the DOM.
- **Form participation**: when `name` is set, a hidden
  `<input type="hidden">` carries the raw `"HH:mm"` value, and is itself
  `disabled` whenever the picker's own effective `disabled` is true, so a
  disabled TimePicker is excluded from `FormData` exactly like a disabled
  native control would be.
