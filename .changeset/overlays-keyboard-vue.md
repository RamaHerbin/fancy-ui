---
"fancy-ui-vue": patch
---

Overlay keyboard and focus fixes. Dialog and AlertDialog now put `aria-haspopup="dialog"`, `aria-expanded` and (while open) `aria-controls` on the element rendered in the `trigger` slot. Closing an overlay with a click on non-focusable content outside it no longer drops focus to the page body — focus stays where the overlay returned it. The focus trap treats a named radio group as one Tab stop, so Tab from the checked radio wraps inside a Sheet, Drawer or Dialog instead of leaving it.
