---
"fancy-ui-svelte": patch
---

fix(pkg): ship `dist/utils` in the published package

The `files` array listed the file `dist/utils.js` but not the `dist/utils/` directory, so `dist/utils/animation.js` (and `color.js`/`geometry.js`) were never published. Any consumer importing from the barrel pulled in `NoiseReveal`, whose `import ... from "../../utils/animation.js"` then failed to resolve at bundle time, breaking the consumer's build. Adding `dist/utils` to `files` restores the missing directory.
