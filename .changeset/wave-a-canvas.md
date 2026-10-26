---
"fancy-ui-svelte": patch
"fancy-ui-react": patch
"fancy-ui-vue": patch
---

FallingStarsBg, FlickeringGrid, MatrixRain, Sparkles, StarsBackground and NoiseReveal now honour `prefers-reduced-motion`, at mount and when the preference changes: the canvases paint one still frame and stop scheduling animation frames, StarsBackground rests still with its pointer parallax off, and NoiseReveal freezes its grain while still jumping to the new reveal state. Without a reduce preference nothing changes.
