---
"fancy-ui-svelte": patch
"fancy-ui-react": patch
"fancy-ui-vue": patch
---

AnimatedLogoCloud, Ripple, Compare's StarField and TextRevealCard's TextRevealStars now honour `prefers-reduced-motion`: the logo strip (every logo wrapped and centred, no edge fade), the rings and the stars rest still, and run as before without a reduce preference. AnimatedLogoCloud also pauses while focus is inside it, and the TextRevealStars drift now moves through `transform` rather than `top`/`left`; the picture without a reduce preference is unchanged.
