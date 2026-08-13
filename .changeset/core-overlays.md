---
"fancy-ui-svelte": minor
---

Core overlay primitives: `Dialog`, `AlertDialog`, `Sheet`, `Drawer`, `Popover`,
`Tooltip`, `HoverCard` and a `Toast` system, plus `_internals/scroll-lock`.

Scroll locking is reference-counted, so nesting an overlay inside another and
closing the inner one leaves the page locked; it restores the scroll position
exactly and compensates for the scrollbar gutter so nothing shifts sideways.
Dismissal runs through the existing layer stack, so one Escape closes one
layer — including `Tooltip`, which now participates in that stack rather than
carrying its own listener.

`AlertDialog` deliberately cannot be dismissed by clicking outside it, with no
prop to re-enable that: a destructive confirmation a user can dismiss by missing
is not a confirmation. Escape does close it, routed through the same cancel path
as the Cancel button, so a keyboard gesture can never become a path to Confirm.
Cancel is focused first.

Every surface that opens must be reachable by keyboard, so `Tooltip` and
`HoverCard` open on focus and not only on hover, and `Tooltip` warns in
development when its trigger is not focusable rather than failing silently.
`Toast` announces through live regions that exist from mount and only change
content, with `assertive` reserved for errors, and pauses its auto-dismiss on
hover or focus for every toast rather than only actionable ones.
