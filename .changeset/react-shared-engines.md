---
"fancy-ui-svelte": patch
"fancy-ui-react": patch
"fancy-ui-vue": patch
---

The React FluidCursor, StarsBackground, FallingStarsBg, Confetti, FlickeringGrid, GlowingEffect, MatrixRain, Sparkles, FireworksHdr, LiquidText, DisplacementText and NoiseReveal now run on the same framework-free engines as the Svelte and Vue components instead of carrying their own copy, so an engine fix reaches all three packages at once. Props, defaults and markup are unchanged. In React, FallingStarsBg, Sparkles and FlickeringGrid now keep their current field when `prefers-reduced-motion` changes instead of regenerating it, FluidCursor forwards `interactive` and `allowMultiple` live like the other packages, and NoiseReveal no longer throws where WebGL is unavailable.

Engine fixes, in every package: FlickeringGrid can no longer stack a second animation loop when it is reported in view twice in a row; FluidCursor removes the listeners it registered even after `interactive` or `contained` changed, and cancels its `splatOnMount` sweep on teardown; StarsBackground stops scheduling frames once its parallax has settled and while the tab is hidden; NoiseReveal pauses its render loop in a background tab and resumes from the same noise phase.
