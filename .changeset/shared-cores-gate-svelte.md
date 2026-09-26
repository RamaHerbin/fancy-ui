---
"fancy-ui-svelte": patch
---

Shared-core hardening. The framework-free engine and helper modules that both packages ship are now byte-identical across packages and gated in CI (`pnpm check:cores`, manifest `shared-cores.json`). Behaviour fixes that landed on the Svelte side while aligning them:

- `focusTrap`: a focusable control inside a `display: none` ancestor is no longer treated as a tab stop, so the trap never lands focus on a control that cannot take it.
- `anchorPosition`: the floating element is measured on its layout box (not the transformed box mid-entrance), and the applied position is stripped on destroy.
- Listbox core: `setActive` refuses an out-of-range index instead of publishing a dangling `aria-activedescendant`.
- Sound engine: a custom theme layer longer than the 400 ms ceiling is clamped when the theme is set directly.
- `ImageTrailCursor`: moving the pointer over an empty image pool no longer throws.

Internal: `_internals` actions are typed structurally (no framework type imports), and dev-only diagnostics were removed from the shared WebGL/WebGPU engines.
