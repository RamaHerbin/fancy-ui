---
"fancy-ui-svelte": patch
---

Presence: consumer `onintrostart`, `onintroend`, `onoutrostart` and `onoutroend` handlers are now called after the component's own logic instead of being silently overridden.
