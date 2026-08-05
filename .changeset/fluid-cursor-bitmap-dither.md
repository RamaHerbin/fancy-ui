---
"fancy-ui-svelte": minor
---

FluidCursor: experimental bitmap dithering mode. The new `dither` prop renders the fluid as a retro ordered-dither bitmap — dye is snapped to a chunky pixel grid and each color channel is quantized against a procedural 4x4 Bayer matrix, so dot density encodes brightness while hues are preserved. Tune with `ditherPixelSize` (CSS px per dot, default 3) and `ditherLevels` (color levels per channel, default 4). Dither forces the WebGL renderer; `hdr` is ignored while it is set.
