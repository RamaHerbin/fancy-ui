---
"fancy-ui-svelte": minor
---

The cameleon skin engine ships in the npm package. `fancy-ui-svelte/cameleon`
exports `FancyProvider`, the ten themable primitives and the six skins;
`fancy-ui-svelte/cameleon/retro-kit` is new — the retro-os skin's own component
vocabulary, grown out of a real site built on the skin: `RetroButton` (the
shadow-ladder press key, primary/outline, sm/md), the label kit (`Chip`,
`NumChip`, `StatusPill`, `RetroTag`, `IconTile`, `InlineIndexLabel`), the
ornaments (`PixelGlyph`, the `steps(1)`-blinking `Led` — reduced-motion aware,
it stays lit — and `Swatches`), and the shared accent vocabulary
(`Accent`, `accentVar`, `accentTint`). The kit's `.r-*` recipe layer and
`--r-*` tokens load with the kit barrel and scope to `[data-skin="retro-os"]`,
so a kit component outside a retro-os provider is visibly unpainted rather
than silently wrong.
