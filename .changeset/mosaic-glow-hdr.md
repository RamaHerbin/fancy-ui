---
"fancy-ui-svelte": minor
"fancy-ui-react": minor
"fancy-ui-vue": minor
---

MosaicGlow: new `hdr` prop (on by default). On displays that report HDR, a WebGPU layer with extended tone mapping adds the light above SDR white: the hottest tiles peak around 1000 nits and the halo gets a hot core. Elsewhere nothing starts and the mosaic is unchanged. The engine gains an `onFrame` option that exposes each painted frame's light field.
