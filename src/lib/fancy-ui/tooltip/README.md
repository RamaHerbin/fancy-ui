# Tooltip

A small anchored label that explains a control — an icon-only button's name,
an abbreviation's meaning. Plain text only: a tooltip you can click into is
not a tooltip, it's a popover that opened on the wrong trigger.

## Usage

```svelte
<script>
	import { Tooltip, IconButton } from "fancy-ui-svelte";
</script>

<Tooltip content="Add to favorites">
	<IconButton label="Add to favorites">♥</IconButton>
</Tooltip>
```

## Opens on focus, not only hover

A tooltip that only appears on `mouseenter` does not exist for anyone
tabbing through the page with a keyboard — there is no hover to trigger it.
`Tooltip` listens for both, and treats them differently on purpose:

- **Focus opens immediately**, no delay. A keyboard user landing on a
  control needs the explanation right away, not after `openDelay` has
  elapsed — that delay exists to stop tooltips flashing as a mouse merely
  passes over things, a problem focus doesn't have.
- **Hover opens after `openDelay`** (500ms by default).

Hover and focus are tracked independently, so releasing one (say, a click
that blurs the trigger while the mouse is still over it) doesn't close a
tooltip the other still wants open.

## Why `children` has to render exactly one focusable element

`children` is caller content — a `Snippet` has no way to hand extra
attributes to its own root element from outside it, so `Tooltip` can't
declare `aria-describedby` or the hover/focus listeners on whatever
`children` renders the way it would on its own markup. Instead, once
mounted, it reaches into the DOM for the first rendered child and attaches
them there imperatively. Concretely: put one real interactive element in
`children` — a native `<button>`/`<a>`, or `IconButton`/`Button`, which both
render one under the hood — and not a bare `<span>` or icon with no
attached listener target of its own.

This is enforced, not just documented: in development, rendering a
non-focusable first child logs a console warning (`[Tooltip] ...`). The
failure mode otherwise is silent and easy to miss in review — hover still
opens the tooltip either way, since hover doesn't care what it lands on, so
everything _looks_ wired right up until a keyboard user tries to reach it
and can't, because the element the tooltip is attached to can never become
`document.activeElement`.

## Accessibility

- `role="tooltip"` on the bubble; the trigger's `aria-describedby` points at
  its real id **only while the bubble is actually open** — the bubble isn't
  mounted at all until then, so the attribute is absent, not dangling,
  for the entire closed lifetime of the tooltip (which is most of it).
- Opens on focus as well as hover (see above) — required, not optional, for
  a control to actually reach keyboard users.
- Escape closes it without moving focus — the trigger stays exactly where
  the keyboard user left it.
- Never holds interactive content: `content` is typed `string`, not
  `Snippet`, specifically so there is no escape hatch into putting a button
  or link inside a tooltip. If it needs to be clickable, it needs to be a
  `Popover` instead.
- Moving the pointer from the trigger onto the bubble itself (when the
  bubble sits in the way) doesn't close it — the bubble tracks hover the
  same way the trigger does.

## Props

| Prop         | Type                                     | Default    | Description                                                        |
| ------------ | ---------------------------------------- | ---------- | ------------------------------------------------------------------ |
| `content`    | `string`                                 | —          | The tooltip's text. Required                                       |
| `side`       | `"top" \| "bottom" \| "left" \| "right"` | `"top"`    | Side of the trigger to place the tooltip on                        |
| `align`      | `"start" \| "center" \| "end"`           | `"center"` | Alignment along the trigger's cross axis                           |
| `offset`     | `number`                                 | `6`        | Gap in pixels between the trigger and the tooltip                  |
| `openDelay`  | `number`                                 | `500`      | Delay in ms before a hover opens it. Never applied to a focus open |
| `closeDelay` | `number`                                 | `0`        | Delay in ms before it closes once neither hovered nor focused      |
| `disabled`   | `boolean`                                | `false`    | Suppresses it entirely — no open on hover or focus                 |
| `children`   | `Snippet`                                | —          | The trigger. Must render exactly one focusable element             |
| `class`      | `string`                                 | —          | Additional CSS classes, merged onto the trigger wrapper            |
| `ref`        | `HTMLElement \| null`                    | `null`     | Bindable reference to the trigger wrapper element                  |

## Theming

The bubble uses `bg-primary`/`text-primary-foreground` — the same
high-contrast pairing a primary `Button` uses, which is what gives it the
"pops off the page" look a tooltip needs regardless of the surrounding
surface. There's no separate tooltip token to override; retint `--primary`
to change it.

## Motion

The bubble fades in over 150 ms on the shared arrival curve (`DURATIONS.fast`
and `JS_EASINGS.out` from the motion foundation). Opacity only — deliberately.
A tooltip is a label, not a surface, so it has no "grew out of the trigger"
story that a scale would tell; every other floating panel in the library does
scale, and this is the one that does not. The growth origin is still written,
and the resolved placement is still exposed as `data-side` / `data-align`, so a
consumer styling off the side the bubble actually landed on gets the same
information everywhere.

The entrance is a JS transition, not a CSS animation, so there is no `--ft-*`
variable to override here; the timing comes from the shared token ladder and
moves with it.

`openDelay` is a scheduling delay, not part of the entrance: nothing is mounted
while it runs. The fade starts when the bubble appears, whatever made it appear.

- **Reduced motion** — no entrance animation at all; the bubble simply appears.
  Its visibility never depended on the animation.
- **Touch and coarse pointers** — unchanged; the entrance is not pointer-gated.
- Closing is instant, deliberately — a tooltip is a label, and an animated
  dismissal makes the pointer feel sticky. The entrance is declared with `in:`,
  never `transition:`, so it can never delay the unmount that `closeDelay`,
  Escape and blur all expect to be immediate.

## Implementation Notes

- Three booleans (`triggerHovered`, `contentHovered`, `focused`) plus one
  function (`updateVisibility`) are the entire state machine: every
  hover/focus/blur/pointerleave handler only ever flips one of the three and
  then calls `updateVisibility`, which is the single place that decides open
  or closed from the current trio and schedules (or cancels) a timer
  accordingly. That single choke point is what keeps a rapid
  hover-out-hover-in from leaving two timers alive at once racing to set
  opposite states — `show`/`hide` both clear any pending timer before
  scheduling their own. The trigger and the bubble get their _own_ hover
  flag rather than sharing one: the pointer crosses from one to the other
  with both briefly true at once, and a single shared flag would let
  whichever side's `pointerleave` fires last clobber the other side's
  `pointerenter`, closing the tooltip while the pointer is still over it.
- `openTimer`/`closeTimer` are cleared on unmount (`onDestroy`) as well as
  on every state change — a tooltip that started a 500ms open timer and was
  then unmounted before it fired must not still flip a since-destroyed
  component's state when the clock catches up.
- `updateVisibility` isn't only called from the five DOM handlers — a
  dedicated `$effect` also calls it whenever `disabled` itself changes.
  `disabled` is a prop, and toggling it fires no pointer/focus event on its
  own, so without that effect, flipping it true while hovered or focused
  would hide the bubble only through the `{#if open && !disabled}` render
  guard, leaving `open` itself still `true` underneath — flipping `disabled`
  back to `false` with the pointer never having left would then pop the
  bubble straight back open, skipping `openDelay` entirely, since nothing
  had gone through `show()` to schedule it. That effect wraps its call in
  `untrack()` so it reacts to `disabled` alone, not to the hover/focus
  state `updateVisibility` also happens to read.
- `aria-describedby` is its own small `$effect`, separate from the one that
  attaches the hover/focus listeners — it reacts to `open` (and `disabled`)
  so the attribute only exists while the bubble it points at does, rather
  than to `ref` alone, which would tie it to when the trigger element is
  found instead of when there's anything for it to describe.
- Positioning goes through `_internals/anchor-position.js`'s
  `anchorPosition` action and `_internals/portal.js`'s `portal`, the same
  two primitives `Popover` uses — no separate flip/clamp math here.
