---
"fancy-ui-svelte": patch
---

FlickeringGrid and FallingStarsBg now default to `color="currentColor"` instead of a fixed `#000000` / `#FFF`, so the effect follows the surrounding text colour and stays visible in both light and dark themes (the engine re-reads the computed colour every frame, so a theme switch lands on the next frame). Pass a hex `color` to keep the old fixed look: `#000000` for FlickeringGrid, `#FFF` for FallingStarsBg. Sparkles keeps its `#ffffff` default but now also accepts `particleColor="currentColor"`.
