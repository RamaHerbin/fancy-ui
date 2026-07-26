---
"fancy-ui-svelte": minor
---

LiquidGlass: add an automatic Safari fallback — WebKit cannot resolve SVG url() filter references inside backdrop-filter, so the chromatic displacement silently disappeared there. On Safari the component now renders a plain frosted blur instead, tunable via the new optional props `fallbackBlur` (default 20) and `fallbackSaturation` (default 180), mirroring FrostedGlass. Docs: both glass components' preview now showcases the landing-page navbar example.
