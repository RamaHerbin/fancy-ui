---
"fancy-ui-vue": patch
---

CardContainer, CardItem, CardSpotlight, GlowingEffect, GlareCard, FrostedGlass, Focus, AppleCard, AnimatedTestimonials, DirectionAwareHover, InteractiveGridPattern, ShimmerButton and RippleButton now snap under reduced motion: their transform, opacity and filter transitions only run when the user has no motion preference, and the state change itself (tilt, spotlight, focus frame, word blur, hover scale) still happens instantly. GlowingEffect also drops its JS-timed angle glide, so the glow arc lands on the pointer angle in the same frame instead of easing toward it.
