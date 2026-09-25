---
"fancy-ui-svelte": minor
---

Meteors: a meteor shower in depth. Each meteor now sits at its own depth (near ones larger, brighter, longer-tailed and faster), has a glowing head and a tail that fades out, fades in instead of popping, and about one in five flares before it burns out. The field is seeded, so the server and the client render the same markup (it used `Math.random()` at render time), spreads across the whole width instead of an 800 px band, and starts part-way through the shower instead of in a burst on load. New props: `angle`, `speed`, `color` and `seed`. The default colour follows the theme (slate on light pages, pale blue-white under `.dark`). Reduced motion shows a still sky. Each meteor is now `aria-hidden`.
