---
"fancy-ui-svelte": minor
"fancy-ui-react": minor
"fancy-ui-vue": minor
---

HDR light for the glow family, first batch: `CardSpotlight`, `Compare`, `ShimmerButton` and `PulseBeam` gain an `hdr` prop (on by default). On displays that report HDR, a shared WebGPU light layer with extended tone mapping adds light above SDR white — up to ~1000 nits on the Compare seam — exactly where each component's CSS glow already is; elsewhere nothing is created and the components render as before. One GPU device is shared by every layer on the page.
