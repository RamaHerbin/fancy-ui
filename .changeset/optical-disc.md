---
"fancy-ui-svelte": minor
"fancy-ui-react": minor
"fancy-ui-vue": minor
---

Add OpticalDisc: a disc turning in space, drawn by a single WebGL fragment shader. One side carries a printed label (the built-in blank one, or any image through `label`); the other is a mirror with a diffraction grating, so every highlight opens into wedges of colour that slide across the surface as the disc turns. Drag it sideways to spin it by hand; it coasts, then settles back to its own pace. `spin`, `tilt`, `iridescence`, `pitch`, `labelColor`, `tint` and `interactive` are live. The canvas is transparent, the loop sleeps when nothing moves, off screen and in a hidden tab, and reduced motion keeps the disc at rest unless it is dragged. The engine is one framework-free core shared byte-identical by the three packages.
