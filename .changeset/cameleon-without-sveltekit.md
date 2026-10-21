---
"fancy-ui-svelte": patch
---

`fancy-ui-svelte/cameleon` now works in any Svelte 5 app, not only SvelteKit ones: `FancyProvider` no longer imports from `$app/environment`, so plain Vite + Svelte projects can render it without an unresolved-import error. Server-rendered markup is unchanged.
