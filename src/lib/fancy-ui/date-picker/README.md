# DatePicker

A field that opens a floating month grid — arrow-key day navigation, Page
Up/Down for months (with Shift for years), min/max and per-day disabling, and
a fully localized accessible name on every day cell.

## Components

- `DatePicker` — the trigger button plus its portalled calendar panel. Not a
  compound: there is no separate day-cell component to import, the grid is
  entirely internal.

## Usage

```svelte
<script lang="ts">
	import { DatePicker } from "fancy-ui-svelte";

	let selected = $state<Date | null>(null);
</script>

<DatePicker bind:value={selected} label="Date" />
```

Or handle the change yourself instead of binding:

```svelte
<script lang="ts">
	import { DatePicker } from "fancy-ui-svelte";

	function onValueChange(value: Date | null) {
		console.log("selected", value);
	}
</script>

<DatePicker {onValueChange} label="Date" />
```

Bound to a window, with individual days rejected on top of it:

```svelte
<script lang="ts">
	import { DatePicker } from "fancy-ui-svelte";

	let selected = $state<Date | null>(null);
	const today = new Date();
	const min = new Date(today.getFullYear(), today.getMonth(), today.getDate());
	const max = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());

	function isWeekend(date: Date): boolean {
		const day = date.getDay();
		return day === 0 || day === 6;
	}
</script>

<DatePicker bind:value={selected} {min} {max} isDateDisabled={isWeekend} />
```

Inside a `FormField`, drop the `id`/`invalid` wiring entirely — the field
context supplies `controlId`, `aria-describedby`, `aria-invalid`, `required`
and `disabled`:

```svelte
<script lang="ts">
	import { FormField, DatePicker } from "fancy-ui-svelte";

	let deadline = $state<Date | null>(null);
</script>

<FormField label="Deadline" required error={deadline ? undefined : "Pick a deadline."}>
	<DatePicker bind:value={deadline} />
</FormField>
```

## Props

| Prop             | Type                            | Default         | Description                                                                            |
| ---------------- | ------------------------------- | --------------- | -------------------------------------------------------------------------------------- |
| `value`          | `Date \| null`                  | `null`          | The selected date; bindable. Always a local-midnight `Date` — see Implementation Notes |
| `onValueChange`  | `(value: Date \| null) => void` | —               | Called with the new value whenever a day is picked                                     |
| `min`            | `Date`                          | —               | Earliest selectable day (inclusive), compared at day granularity                       |
| `max`            | `Date`                          | —               | Latest selectable day (inclusive), compared at day granularity                         |
| `weekStartsOn`   | `0 \| 1`                        | `1`             | 0 for Sunday, 1 for Monday                                                             |
| `disabled`       | `boolean`                       | `false`         | Blocks opening the panel; excluded from form submission                                |
| `required`       | `boolean`                       | `false`         | Marks the field required for the surrounding form                                      |
| `invalid`        | `boolean`                       | `false`         | Drives the error border and `aria-invalid`                                             |
| `id`             | `string`                        | —               | Element id                                                                             |
| `name`           | `string`                        | —               | Native `name` — when set, a hidden ISO-date input carries the value                    |
| `label`          | `string`                        | —               | Accessible name — for a control with no visible Label next to it                       |
| `placeholder`    | `string`                        | `"Pick a date"` | Shown in the trigger while no day is selected                                          |
| `locale`         | `string`                        | —               | BCP 47 locale for month, weekday, day and trigger-label formatting                     |
| `isDateDisabled` | `(date: Date) => boolean`       | —               | Rejects individual days beyond `min`/`max` — e.g. weekends, holidays                   |
| `class`          | `string`                        | —               | Additional CSS classes, merged onto the trigger button                                 |
| `ref`            | `HTMLButtonElement \| null`     | `null`          | Bindable element reference to the trigger button                                       |

All of `disabled`, `required` and `invalid`, plus the element's `id`, are
overridden by a surrounding `FormField`'s own context.

## Theming

The accent border/halo and the selected day's fill have no semantic token, so
they fall back to a `light-dark()` pair local to the component:

```css
.my-form {
	--ft-accent: oklch(0.55 0.2 300);
}
```

Set `--ft-accent` higher up the tree to retint the trigger's focus ring and
every day's own focus ring. The selected day's fill and the panel surface
itself come from the shared `bg-accent`/`text-accent-foreground` and
`bg-popover`/`text-popover-foreground`/`border-border` tokens, not a
component-local variable — retint those globally to change them.

## Motion

The panel enters with a 150 ms opacity + scale rise (the shared `fast` rung and out-curve, applied in JS — there is no `--ft-*`
variable to override for this entrance), growing from a `0.92` floor. The growth origin follows the side
the panel was actually placed on — flipped placements included — so it always
appears to come out of the trigger rather than out of its own centre. Exposed as
`data-side` / `data-align` for consumers that want to key their own styling off the
resolved placement.

- **Reduced motion** — no entrance animation at all; the panel simply appears.
  Visibility never depended on the animation.
- **Touch and coarse pointers** — unchanged; the entrance is not pointer-gated.
- Closing is currently instant.

## Implementation Notes

- **Time zones**: every date this component produces is a local-midnight
  `Date` — constructed from `new Date(year, month, day)`, never through a
  UTC/ISO string. A day committed by clicking or pressing Enter is always
  `new Date(y, m, d)` at local midnight; comparisons against `value`
  (highlighting the selected cell, `min`/`max`, `isDateDisabled`) all compare
  whole calendar days, ignoring whatever time-of-day a caller-supplied `Date`
  happens to carry. This is the same convention `_internals/calendar-core.ts`
  itself uses, and it is what keeps a date picked near a month or year
  boundary from silently landing on the wrong day if it is later formatted in
  a different time zone. If you need a specific time of day alongside the
  date, combine this component's `Date` with a separate `TimePicker` value
  rather than expecting `DatePicker` to carry one.
- **The grid is a real `role="grid"`** (`<table>`), with `role="columnheader"`
  weekday headers and `role="gridcell"` days. Arrow keys move by one day,
  crossing week and month boundaries; Page Up/Down move by month; Shift+Page
  Up/Down move by year; Home/End jump to the Monday/Sunday (per
  `weekStartsOn`) of the focused week. Every day cell's `aria-label` is a full
  formatted date (e.g. "Friday, July 24, 2026"), from `Intl.DateTimeFormat`
  with the `locale` prop — never a hardcoded English month name.
- **The weekday header uses three-letter abbreviations** (`Intl.DateTimeFormat`
  with `weekday: "short"` — "Mon", "Tue", ...), a deliberate divergence from
  the mockup's single-letter initials. Single letters collide within a week in
  several languages — English's own Tuesday/Thursday both start with "T" and
  Saturday/Sunday both start with "S" — so a locale-driven single-letter
  header would silently read as ambiguous in exactly the languages this prop
  exists to support, not only in unusual ones. Please don't "fix" this back to
  single letters without re-reading this note.
- **Roving tabindex**: exactly one day cell carries `tabindex="0"` at a time,
  tracking the internal "focused day" independently of the selected `value`.
  Moving past the edge of the displayed month switches `viewDate` to the new
  month in the same keypress, so arrow navigation never lands on a day that
  isn't actually rendered.
- **Disabled days** (outside `min`/`max`, or rejected by `isDateDisabled`) are
  skipped as a block by arrow/Home/End/Page navigation rather than becoming a
  dead end, and are never selectable by click or Enter. The search that skips
  them is bounded (about ten years of days) so a caller who disables every
  day — accidentally or not — leaves focus where it was instead of hanging
  the tab.
- **Page Up/Down searches toward the interior when clamping moved the
  target.** Paging to a month outside `min`/`max` clamps back into range
  first; if the clamped day is itself disabled, the fallback search looks
  toward the interior (away from whichever bound did the clamping) rather
  than continuing in the original page direction — the far side of that
  bound is guaranteed disabled by the same `min`/`max` check, so continuing
  outward would exhaust the whole bounded search and leave the keypress a
  silent no-op. Covered in `DatePicker.test.ts` with `min`/`max` and
  `isDateDisabled` combined at exactly the boundary.
- **The trigger uses `role="combobox"`** with `aria-haspopup="grid"`, the ARIA
  pattern for a text-free date-picker combo box whose popup is a real grid
  dialog rather than a listbox. This is also what makes `aria-invalid` and
  `aria-required` valid attributes on it — the plain implicit `button` role
  does not support either.
- **No focus trap.** Unlike `Popover`, this panel does not use
  `_internals/focus-trap.ts`: a trap's default "focus the first focusable
  descendant" would fight the roving-tabindex position this component already
  manages itself (which day should be focused first is never "whichever
  element happens to be first in the DOM" — it's the selected day, or today).
  Tab can therefore move focus out of the panel while it's open, the same way
  a listbox-style combobox popup behaves rather than a modal dialog. Closing
  the panel — by Enter, click, Escape, or an outside click — always returns
  focus to the trigger button, since there is no trap to do that for free and
  an Escape press would otherwise leave focus on a grid cell that is about to
  be removed from the DOM (which browsers resolve by dropping focus to
  `<body>`).
- **The month/year heading is announced** through a visually hidden
  `role="status"` live region whenever it changes, so paging through months
  with the keyboard is audible to a screen reader user even though nothing
  else on the page moved.
- **`aria-controls`** on the trigger is only ever present while the panel
  actually exists in the DOM — never left pointing at an id with nothing
  behind it while closed.
- **Form participation**: when `name` is set, a hidden
  `<input type="hidden">` carries the value as `YYYY-MM-DD` (the same shape a
  native `<input type="date">` submits), and is itself `disabled` whenever the
  picker's own effective `disabled` is true, so a disabled DatePicker is
  excluded from `FormData` exactly like a disabled native control would be.
