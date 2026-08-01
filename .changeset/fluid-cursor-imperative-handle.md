---
"fancy-ui-svelte": minor
---

FluidCursor: new optional `onReady` callback handing the parent an imperative handle to drive the simulation programmatically — `moveTo(x, y, color?)` traces a path with a synthetic pointer, `penUp()` ends a stroke without a connecting streak, `burst(x, y, dx, dy, color)` fires a one-off impulse — plus a `renderLevel` readback (`"webgpu-hdr" | "webgpu-sdr" | "webgl-p3" | "webgl-sdr" | "none"`) so callers can tell true HDR output from a clamped fallback. `webgpu-hdr` requires both extended tone mapping and a display reporting `(dynamic-range: high)`; when no renderer comes up at all the callback receives an inert handle reporting `"none"`. The new `FluidCursorHandle` and `FluidRenderLevel` types are exported from the package root. Behavior is unchanged when `onReady` is omitted.
