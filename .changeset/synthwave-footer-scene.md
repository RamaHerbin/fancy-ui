---
"fancy-ui-svelte": patch
---

Landing page: rework the footer's synthwave Canvas 2D scene — static scenery (starry sky, scanline sun, mountains, city skyline, palm silhouettes, water reflection, retro car with glowing tail-lights) is baked into offscreen layers once, with only the animated perspective grid composited per frame. Rendering is DPR-aware (capped at 2), randomness is seeded for a deterministic layout, and the scene respects `prefers-reduced-motion` (renders a static frame and reacts live to the media query). The CTA section is now `min-h-[90vh]`. Docs-site only — no change to the published component API.
