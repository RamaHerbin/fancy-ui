---
"fancy-ui-svelte": patch
---

Development-only warnings no longer read the Vite-specific environment object directly, so the published package works in any bundler without packaging warnings.
