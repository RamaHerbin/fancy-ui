---
"fancy-ui-svelte": patch
"fancy-ui-react": patch
"fancy-ui-vue": patch
---

RippleButton, CardContainer (3D card) and GlareCard now give keyboard focus the same cue as hover: the ripple glow and ring appear on `:focus-visible`, the 3D card lifts its layers with a flat tilt when focus is inside it, and the glare foil lights up when something inside the card is focused. RippleButton keeps its hover glow to devices that hover (`@media (hover: hover)`), CardContainer and GlareCard ignore touch pointers, and both RippleButton and GlareCard recentre their glow when the pointer leaves, so the focus cue starts from the middle. Mouse and pen behaviour, props and the resting look did not change.
