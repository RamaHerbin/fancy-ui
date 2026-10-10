---
"fancy-ui-svelte": patch
---

The declared Svelte peer range is now `^5.20.0`, which is what the components have required since they adopted `$props.id()` for stable ids; `^5.0.0` let older Svelte 5 installs fail at runtime.
