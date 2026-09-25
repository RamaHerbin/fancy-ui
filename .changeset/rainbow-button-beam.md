---
"fancy-ui-svelte": patch
---

RainbowButton: hovering or focusing the button now sends a rainbow beam around its border, with a soft halo just outside it. The beam is a conic gradient turning through a registered CSS angle, one lap per 1.5 × `speed`, and it only runs while the button is hovered or focused. The resting look is unchanged. Under reduced motion the beam still fades in, frozen at one angle.
