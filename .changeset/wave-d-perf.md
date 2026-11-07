---
"fancy-ui-svelte": patch
"fancy-ui-react": patch
"fancy-ui-vue": patch
---

Decorative loops now stop when nobody can see them. The CSS loops of NeonBorder, GradientButton, GlowBorder, BorderBeam, AnimatedBeam, Compare, Meteors, ThinkingIndicator, ArtifactCard and TextRevealCard pause while the component is more than a screen away from the viewport, and pick up exactly where they left off when it comes back. The canvas components that draw at the device pixel ratio (FlickeringGrid, LiquidText, NoiseReveal and FluidCursor) cap it at 2, so a 3x display no longer pays for a backing store that is more than twice as large as it needs to be. FlickeringGrid also no longer stacks a second frame loop when it is reported visible twice in a row.

The ambient canvas loops (MatrixRain, Sparkles, StarsBackground, FallingStarsBg, DisplacementText, the editorial engine and PulseBeam) now share one frame clock that parks a loop while it is out of view or the tab is hidden and stops entirely when nothing is live: StarsBackground sleeps once its spring settles and wakes on the next pointer move, DisplacementText renders only when something changed, and Sparkles moves at the same speed on a 120 Hz display. MatrixRain, Sparkles and FallingStarsBg cap their pixel ratio at 2 as well.
