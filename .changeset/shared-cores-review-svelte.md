---
"fancy-ui-svelte": patch
---

Fixes surfaced by review of the shared cores:

- `FocusTrap`-driven surfaces (Dialog, Sheet, Drawer, menus): a native control carrying `tabindex="-1"` is no longer treated as the last tabbable item, so Tab from the preceding control stays inside the modal.
- Scroll lock restores the horizontal scroll position as well as the vertical one when the last locked surface closes.
- `SmoothCursor` restores the inline body cursor it replaced instead of clearing it.
- `ImageTrailCursor` with no images no longer starts an idle animation-frame loop on the first pointer move.
- `FireworksHdr`: `quality`, `interactive`, `onReady` and `onLost` are read live, so a value changed while the GPU is still starting or recovering is honoured, and the wrapper's observers are torn down with the engine (handle `cleanup()` or an unrecoverable GPU loss).
- `FluidCursor`: `onReady` is read live, so a callback replaced before the GPU finishes initialising receives the handle.
