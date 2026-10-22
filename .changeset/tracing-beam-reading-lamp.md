---
"fancy-ui-svelte": minor
"fancy-ui-react": minor
"fancy-ui-vue": minor
---

TracingBeam redesigned as a reading lamp on a rail. The lamp sits on the reader's line of sight (`readingLine`) and trails the scroll on a spring; what has been read stays softly lit; a marker on the rail stands for every heading in the content and lights up as the lamp passes it. The rail now lives in its own gutter column (`--tracing-beam-gutter`) instead of hanging outside the wrapper, so it is never clipped; colours follow the theme (`accent` / `--tracing-beam-accent`) instead of fixed hex values; and under `prefers-reduced-motion` the lamp still tracks the page instead of disappearing. Fixes the beam that stayed unlit on most pages (its scroll maths assumed the wrapper filled the viewport) and the shared gradient id that made every beam after the first follow the first one.
