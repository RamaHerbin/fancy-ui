---
"fancy-ui-svelte": minor
---

First Core primitives: the Actions group. `Button` (six variants, three sizes, a
loading state, and a polymorphic anchor mode), `IconButton`, `ButtonGroup`,
`Link`, `Toggle`, `ToggleGroup` and `CopyButton`.

These are the first components that dress themselves entirely in the theme's
semantic tokens rather than fixed colours, so they follow the light/dark switch,
the theme generator and the docs skins without per-skin overrides. The one colour
with no semantic token — the brand accent used by the accent variant and the
focus ring — resolves through `--ft-accent`, with a `light-dark()` fallback, and
can be retuned from anywhere up the tree.
