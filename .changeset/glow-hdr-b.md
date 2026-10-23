---
"fancy-ui-svelte": minor
"fancy-ui-react": minor
"fancy-ui-vue": minor
---

HDR light for the glow family, second batch: `GradientButton`, `NeonBorder`, `GlowBorder`, `BorderBeam`, `Meteors` and `AnimatedBeam` gain an `hdr` prop (on by default). Their glow is animated purely in CSS, so the shared light layer reads the browser's live computed values each frame — the animated `@property` angle, the `offset-path` rider's box, the meteor heads' boxes, the dash offset — and adds light above SDR white exactly where the CSS draws it, on displays that report HDR. Elsewhere nothing is created.
