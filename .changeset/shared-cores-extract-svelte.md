---
"fancy-ui-svelte": patch
---

Fourteen canvas, WebGL and pointer-driven components now run on a framework-free core (`<slug>-core.ts`: `create<Name>(elements, options) → { setOptions, resize, destroy }`) with the Svelte component reduced to markup and prop plumbing. Public props, defaults, timing and rendering are unchanged; the cores are byte-shared with the other framework packages and gated in CI. Small observable deltas that fell out of the refactor:

- `MatrixRain`: a runtime `glyphSize` / `density` change re-lays the grid once instead of twice (the second, one-frame-later black flash is gone).
- `FlickeringGrid`: a frame that survived unmount no longer keeps drawing on the detached canvas.
- `NoiseReveal`: a browser without WebGL leaves the host empty instead of throwing during mount.
- `MosaicGlow`: with no 2D context available, no pointer listeners are attached (they were inert before).
- `FireworksHdr`: the visibility and resize observers are created at mount rather than at renderer activation; both are disconnected on unmount.

Components: bg-falling-stars, bg-stars, confetti, displacement-text, fireworks-hdr, flickering-grid, fluid-cursor, glowing-effect, liquid-text, matrix-rain, mosaic-glow, noise-reveal, smooth-cursor, sparkles.
