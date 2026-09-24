---
"fancy-ui-svelte": patch
---

ShimmerButton: a new look. The spark that circled the border is replaced by a satin sheen: every cycle a soft band of light (a wide halo with a thinner, brighter core) crosses the face on a slight diagonal, lifts the label to full white, then rests. On hover the sweep hands over to a highlight that follows the pointer. A thin rim catches the same light. The props are unchanged: `shimmerColor` tints the sheen, rim and highlight, `shimmerSize` sets the rim thickness, `shimmerDuration` is one sweep plus its pause. Reduced motion keeps a faint static sheen. The inner `.shimmer-slide` and `.spin-around` elements are gone; anything that styled them should target the new `.shimmer-button__*` layers.
