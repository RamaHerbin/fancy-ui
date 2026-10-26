---
"fancy-ui-svelte": patch
"fancy-ui-react": patch
"fancy-ui-vue": patch
---

RippleButton, CardContainer (3D card) and GlareCard now give keyboard focus the same cue as hover and ignore touch pointers: the ripple glow and ring appear on `:focus-visible` (hover moves inside `@media (hover: hover)`), the 3D card lifts its layers with a flat tilt when focus is inside it, and the glare foil lights up centred when something inside the card is focused. Mouse and pen behaviour, props and the resting look did not change.
