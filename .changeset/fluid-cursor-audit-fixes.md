---
"fancy-ui-svelte": patch
---

FluidCursor fixes from audit:

- Fix broken singleton: the instance registry now lives in a module script, so a second instance correctly destroys the first (previously the variable was per-instance and the singleton never engaged).
- Auto-scale splat radius in contained mode so the fluid effect has the same on-screen size as fullscreen usage, instead of shrinking with the container height.
- Clamp simulation/dye framebuffer resolution to the canvas size, avoiding oversized GPU buffers in wide, short containers.
- Ignore pointer events outside the container in contained mode: no more click splats or wasted GPU work when interacting elsewhere on the page.
