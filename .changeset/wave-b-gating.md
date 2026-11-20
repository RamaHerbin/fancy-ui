---
"fancy-ui-svelte": patch
"fancy-ui-react": patch
"fancy-ui-vue": patch
---

ShimmerButton, GradientButton, InteractiveHoverButton, RainbowButton, BentoGrid, DimSiblings, LineHoverLink, ThreadList, Marquee review cards and Book now keep their hover motion inside `@media (hover: hover)` and give every hover effect a keyboard twin: a touch screen that fakes a hover after a tap no longer leaves a glow, a lift or a parked line behind, and `:focus-visible` (or `:focus-within`) reaches the same state on its own, including the Book cover, which is now focusable and opens on focus. BentoGrid cards keep their call-to-action visible on touch through the same gate instead of a separate `hover: none` fallback. Hover-only rules that already had a twin keep their look, timings and reduced-motion behaviour.
