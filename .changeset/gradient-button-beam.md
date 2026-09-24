---
"fancy-ui-svelte": patch
---

GradientButton: a new look. The blurred rainbow ring that spun behind the button is replaced by a beam: a short arc of light, carrying every colour of `colors`, travels around the border with a fainter echo opposite it, and casts a soft coloured glow into the face as it passes. Hovering or focusing brightens the glow. The props are unchanged, but some defaults moved to fit the new look: `colors` is a softer six-colour set, `duration` 3000 ms (was 2500), `borderWidth` 1.5 px (was 2), `borderRadius` 12 px (was 8), `bgColor` `#161616` (was `#000`); `blur` now sets the softness of the inner glow. The text defaults to white. Reduced motion stops the beam at a fixed angle.
