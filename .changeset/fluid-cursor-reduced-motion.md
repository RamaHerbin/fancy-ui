---
"fancy-ui-svelte": patch
"fancy-ui-react": patch
"fancy-ui-vue": patch
---

FluidCursor now honours `prefers-reduced-motion`: with reduce on, no simulation starts (no animation loop, no pointer listeners, no GPU context) and the layer stays an empty, transparent canvas. Turning the preference on or off during the session stops or restarts the fluid without remounting the component.
