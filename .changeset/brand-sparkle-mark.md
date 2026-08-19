---
"fancy-ui-svelte": patch
---

New brand mark: a four-pointed sparkle running pink through violet to cyan under
an emissive rim, replacing the five floating circles.

`static/favicon.svg` holds the geometry, so every generated raster — favicon,
touch icon, PWA icons, the social card and all 106 per-component cards — now
carries it. A site-side `Logo.svelte` renders the same mark inline with `size`,
`glow` and `animated` props, unique per-instance gradient ids so several can
share a page, and a twinkle that stands down under `prefers-reduced-motion`. It
sits beside the wordmark in the landing header, the landing footer and the docs
sidebar; the retro-os skin keeps its own pixel logo.

The brand-asset script gained the `pnpm build:brand-assets` entry its own
docstring already advertised, reads the component count off the registry instead
of a hardcoded number that had drifted to 61, and emits the README raster.
