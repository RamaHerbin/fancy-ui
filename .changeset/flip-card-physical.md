---
"fancy-ui-svelte": minor
---

FlipCard: a physical, accessible flip. The card now lifts through the middle of the turn and lands with a slight overshoot, its shadow spreads and gathers, and the faces catch the light as they turn (a sweeping sheen, and a shade that deepens edge-on). It keeps turning the same way instead of rewinding, and in hover mode it turns the way the pointer travels. New props: `trigger` (`"hover"` default, or `"click"` for a toggle button with Enter/Space), bindable `flipped`, `onflip`, `duration` (700 ms), `glare` and `label`. Hover mode now also flips on keyboard focus and on tap. The face turned away is `inert` and `aria-hidden`. Both faces follow the theme (`bg-card`, `text-card-foreground`) instead of a hard-coded dark back. Reduced motion cross-fades the faces instead of turning.
