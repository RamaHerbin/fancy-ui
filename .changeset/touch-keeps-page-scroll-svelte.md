---
"fancy-ui-svelte": patch
---

Pointer effects no longer trap vertical page scrolling on touch screens. ImageTrailCursor, Compare, TextRevealCard and EditorialEngine now declare `touch-action: pan-y` instead of `none` (horizontal tracking and drags still work), and no longer cancel touchstart or touchmove; the fluid cursor registers its touch listeners as passive.
