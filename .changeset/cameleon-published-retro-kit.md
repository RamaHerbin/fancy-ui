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

The kit also grows its windows, media and chrome vocabulary, ported from the
reference portfolio implementation that grew the retro-os language in the
first place: `SectionWindow` and `AppWindow` (the two DOS-titlebar window
grammars), `NotchedFrame` (the three-layer chamfered-corner hero frame) and
`RetroCard` (the accent-aware hover card); `VideoFrame`, `PlayBadge` and
`EmptyMediaFrame` for poster-and-play video staging with a dashed-border
placeholder for demos not yet recorded; and `HeaderBar`, the page-header
shell — ink tile, clamp()'d title/subtitle, and a slot on the right for a
consumer's own navigation or skin controls.
