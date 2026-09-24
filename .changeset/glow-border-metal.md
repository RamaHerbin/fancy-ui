---
"fancy-ui-svelte": minor
---

GlowBorder: a new look, closer to polished metal. Iridescent reflections now flow along a dark chrome ring (two metallic conic fields turning against each other), a glint rides around it and spills a soft glow on both sides of the edge. Still pure CSS. New props: `preset` (`"chromatic"`, `"silver"`, `"gold"`) and `strength` (0–1, the glint and its glow). `color` now tints the metal's reflections and overrides the preset; it no longer has a default (it was `"#FFF"`). `borderWidth` defaults to 1.5 px (was 2). Every palette has a light-page version, switched by `.dark`. The overlay is now `aria-hidden`. `GLOW_BORDER_PRESETS` and the `GlowBorderProps` / `GlowBorderPreset` types are exported.
