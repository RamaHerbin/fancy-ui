---
"fancy-ui-react": minor
---

Add DatamoshTransition, the page-transition overlay already in `fancy-ui-svelte`: a fixed grid of columns fills with flat blocks of saturated colour that fall, snap open through the middle and squeeze shut; `cover()` drops the columns over the page and `reveal()` lets them fall away. Variants (`variant`, `sweep`, palette presets through `colors`) and the picture `source` mode come with it. The methods travel through the forwarded ref (`DatamoshTransitionHandle`: `cover`, `reveal`, `play`, `element`), and the Svelte `bind:phase` becomes `onPhaseChange`.
