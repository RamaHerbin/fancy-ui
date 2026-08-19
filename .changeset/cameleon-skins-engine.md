---
"fancy-ui-svelte": patch
---

Add the Cameleon Engine — a multi-skin UI system where the same headless component API (Button, Input, Textarea, Select, Checkbox, Radio, Switch, Slider, Badge, Tooltip) renders in radically different art directions ("skins": Brutal, Glass, Terminal), driven by a `<FancyProvider skin={...}>` context provider, scoped design tokens, and per-skin recipes. Includes a `/skins` documentation page that reproduces a full design-system layout (color tokens, type scale, grid, components, responsive, and a 10-control × 6-state matrix) and re-skins the whole page live. Docs-site only — the engine lives under `src/lib/cameleon/` and is not part of the published component surface.
