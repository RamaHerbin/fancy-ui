---
"fancy-ui-vue": patch
---

Development-only diagnostics now read `NODE_ENV` through a shared helper that bundlers replace statically, with no Vite-specific environment object in the published sources.
