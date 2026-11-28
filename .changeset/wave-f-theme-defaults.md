---
"fancy-ui-svelte": patch
"fancy-ui-react": patch
"fancy-ui-vue": patch
---

Theme-aware defaults. Several decorative defaults were light-world colours that vanished in one theme; they now read in both. Sparkles draws its particles in `currentColor` on a transparent background (the navy slab is gone), LineShadowText hatches in `light-dark(black, white)`, CardSpotlight's spotlight is a foreground mix, Focus frames in the accent colour, RippleButton and Ripple ring in the text colour, GlowBorder's light palette gains real chroma, FlipCard's back face keeps its silhouette on dark, Pagination's pill follows the nav accent, and RadioGroup, ButtonGroup, ToggleGroup and CopyButton lift their borders and dividers in dark so they still read. A consumer who relied on an old default sees a different colour; passing the old value as a prop restores it.
