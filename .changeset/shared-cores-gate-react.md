---
"fancy-ui-react": patch
---

Shared cores re-aligned byte-for-byte with the Svelte reference: WebGPU typings now come from `@webgpu/types` instead of local copies, dev-only diagnostics are gone from the shared engines, and `ImageTrailCursor` keeps its animation loop running with an empty image pool (matching Svelte; no visible effect). No API change.
