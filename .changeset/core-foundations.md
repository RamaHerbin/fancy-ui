---
"fancy-ui-svelte": minor
---

Groundwork for the upcoming Core component family: every component now carries a
`group` ("core" | "fancy") in its registry metadata, the category union gains
`actions`, `forms`, `overlays` and `display`, and shared internal utilities
(portal, focus trap, dismissable layers, anchor positioning, calendar core, ids)
land under `_internals` for the primitives to build on. The docs sidebar and
gallery now group and filter components by Core/Fancy.
