---
"fancy-ui-svelte": patch
"fancy-ui-react": patch
"fancy-ui-vue": patch
---

ConfettiButton no longer submits a surrounding form: `type` now defaults to `"button"` (overridable), and `class`, native button attributes and a click callback are forwarded. The callback runs once after the burst; a disabled button fires neither.
