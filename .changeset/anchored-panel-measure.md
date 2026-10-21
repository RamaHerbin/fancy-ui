---
"fancy-ui-svelte": patch
"fancy-ui-react": patch
"fancy-ui-vue": patch
---

Tooltip and the other anchored panels: a panel with no width of its own is now measured as the fixed box it becomes, so it centres on its trigger. Before, the first measurement read it as a block as wide as the page, and a tooltip opened pinned to the left edge of the viewport.
