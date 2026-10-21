---
"fancy-ui-svelte": minor
"fancy-ui-react": minor
"fancy-ui-vue": minor
---

Add TickNav: a navigation list on a ruler of tick marks. Every line the pointer crosses plucks like a string (a sweep strums the ruler), neighbouring lines and ticks stretch and light up on springs, and an optional preview card follows the pointer. A `variant="neon"` turns the lines into glowing tubes with a beam of light riding every pluck. Keyboard focus drives the same effect; `sound` plays a cue per plucked line. The sound rate limits drop to 30 ms for `hover` and 15 ms for `tick` so a sweep stays audibly continuous. The motion lives in a framework-free core shared by the Svelte, React and Vue packages.
