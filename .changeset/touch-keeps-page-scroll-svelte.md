---
"fancy-ui-svelte": patch
---

Pointer effects no longer trap vertical page scrolling on touch screens, and pinch zoom stays available. ImageTrailCursor and EditorialEngine replace `touch-action: none` with `pan-y pinch-zoom`, and ImageTrailCursor's touch listeners no longer cancel the gesture. TextRevealCard no longer cancels touchmove, which kept a swipe over the card from scrolling the page, and now declares `pan-y pinch-zoom`. Compare, which declared no touch-action, now declares `pan-y pinch-zoom`, so a horizontal drag moves the handle while a vertical swipe scrolls the page. EditorialEngine claims the gesture only when a touch starts on an orb, so orbs still drag in any direction while the rest of the stage scrolls the page.
