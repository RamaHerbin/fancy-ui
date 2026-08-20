/**
 * Retro-OS kit — the skin's own component vocabulary, beyond the shared
 * primitives.
 *
 *   import { RetroButton, Chip, Led, type Accent } from "fancy-ui-svelte/cameleon/retro-kit";
 *
 * Two jobs, and they are the reason this barrel exists rather than everyone
 * importing components by path:
 *
 *  1. It imports `./kit.css` — the `--r-*` tokens and `.r-*` recipe layer —
 *     exactly once. Any consumer that renders a kit component has, by
 *     construction, already pulled the recipes in. It is deliberately NOT
 *     imported by the skin itself: using the retro-os skin without the kit
 *     must not download the kit's CSS.
 *  2. It names the accent vocabulary, the one piece of shared state between
 *     otherwise independent components.
 *
 * Everything here renders under `<FancyProvider skin={retroOsSkin}>` — the
 * tokens are scoped to `[data-skin="retro-os"]`, so outside that provider the
 * components are visibly unpainted rather than silently wrong.
 */

import "./kit.css";

export {
	ACCENT_TINT,
	ACCENT_VAR,
	accentTint,
	accentVar,
	type Accent,
} from "./accents.js";

export { default as RetroButton, type RetroButtonProps } from "./RetroButton.svelte";
export { default as Chip, type ChipProps } from "./Chip.svelte";
export { default as NumChip, type NumChipProps } from "./NumChip.svelte";
export { default as StatusPill, type StatusPillProps } from "./StatusPill.svelte";
export { default as RetroTag, type RetroTagProps } from "./RetroTag.svelte";
export { default as IconTile, type IconTileProps } from "./IconTile.svelte";
export { default as InlineIndexLabel, type InlineIndexLabelProps } from "./InlineIndexLabel.svelte";
export { default as PixelGlyph, type PixelGlyphProps } from "./PixelGlyph.svelte";
export { default as Led, type LedProps } from "./Led.svelte";
export { default as Swatches, type SwatchesProps } from "./Swatches.svelte";
