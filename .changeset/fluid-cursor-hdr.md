---
"fancy-ui-svelte": minor
---

FluidCursor HDR mode: new `hdr` and `hdrBoost` props. When enabled, the simulation renders through a new WebGPU engine (WGSL port of the fluid solver) into an `rgba16float` / `display-p3` canvas with extended tone mapping — colors glow brighter than SDR white on HDR displays. Falls back automatically to the existing WebGL renderer (with a wide-gamut P3 backbuffer where supported), and rendering with `hdr` disabled is unchanged.

Also: in `contained` mode the splat radius now auto-scales to viewport-equivalent size (capped at ~30% of the container height), so the effect no longer looks tiny inside small containers such as docs demos. Fullscreen and viewport-sized containers are unaffected.
