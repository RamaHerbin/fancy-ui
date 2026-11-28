---
"fancy-ui-svelte": patch
"fancy-ui-react": patch
"fancy-ui-vue": patch
---

DirectionAwareHover and TextRevealCard are now reachable by keyboard: the card takes focus, and focus shows the fully presented state (the overlay and caption, or the whole revealed text) while Escape or blur returns to rest. The hover overlay classes gain focus-within twins, DirectionAwareHover's hover path ignores touch pointers, and the pointer scrub and the touch reveal are unchanged.
