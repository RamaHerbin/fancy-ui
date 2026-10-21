---
"fancy-ui-svelte": patch
---

Pointer effects no longer trap vertical page scrolling on touch screens. ImageTrailCursor, Compare, TextRevealCard and EditorialEngine now declare `touch-action: pan-y pinch-zoom` instead of `none` (pinch zoom stays available), and no longer cancel touchstart or touchmove outside a drag they own. EditorialEngine claims the gesture only when a touch starts on an orb, so orbs still drag in any direction while the rest of the stage scrolls the page.
