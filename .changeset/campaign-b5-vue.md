---
"fancy-ui-vue": patch
---

CardContainer, CardItem, CardSpotlight, GlowingEffect, GlareCard, FrostedGlass and Focus now snap under reduced motion: the tilt, spotlight fade, glow fade, focus frame slide, word blur and glass settle still change state, but instantly. Their transform, opacity and filter transitions only run when the user has no motion preference.
