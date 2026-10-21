---
"fancy-ui-svelte": patch
"fancy-ui-react": patch
"fancy-ui-vue": patch
---

Button, IconButton and CopyButton now forward native attributes and listeners (`id`, `aria-*`, `data-*`, `onfocus`, ...) to their `<button>`, or to the `<a>` once `href` is set. The disabled and loading guards, the inert-link attributes and the button `type` still take precedence, and CopyButton accepts a click handler that runs right after the copy starts.
