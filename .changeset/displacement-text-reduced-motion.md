---
"fancy-ui-svelte": patch
"fancy-ui-react": patch
"fancy-ui-vue": patch
---

DisplacementText now honours `prefers-reduced-motion`, at mount and when the preference changes: with reduce on, no render loop or WebGL context runs and the real text is shown as selectable DOM text, styled like the resting frame; turning it off starts the effect again without remounting. The same static text is used when WebGL2 is unavailable and after a lost GPU context. Prop changes no longer rebuild the scene (the texture is re-rasterized in place), and the pixel ratio is capped by a new `maxDpr` prop (default 2).
