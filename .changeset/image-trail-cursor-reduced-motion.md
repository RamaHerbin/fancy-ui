---
"fancy-ui-svelte": patch
"fancy-ui-react": patch
"fancy-ui-vue": patch
---

ImageTrailCursor now honours `prefers-reduced-motion`, at mount and when the setting changes during the session: while reduced motion is preferred the trail is off (no pointer listeners, no animation loop, no images spawned), and it starts or stops in place when the preference flips, without a remount.
