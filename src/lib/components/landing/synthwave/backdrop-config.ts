/**
 * Asset naming for the static synthwave backdrop panorama. The scene is a
 * single art-directed `<picture>` (desktop panorama + tighter mobile crop);
 * this module is the one source of truth for the rendered widths and the
 * `<name>-<width>.<ext>` file convention under `static/synthwave/`.
 */

/** Root of the generated raster assets (served from `static/`). */
export const ASSET_BASE = "/synthwave";

/**
 * Rendered widths per asset, largest first. Every name/width pair listed here
 * must have its `.avif` AND `.webp` on disk under `static/synthwave/`.
 */
export const ASSET_WIDTHS: Record<string, number[]> = {
	"neon-horizon-drive": [2172, 1920, 1280],
	"neon-horizon-drive-mobile": [768],
};

/** Most efficient format first — the browser picks the first one it supports. */
const ASSET_FORMATS = [
	{ ext: "avif", type: "image/avif" },
	{ ext: "webp", type: "image/webp" },
] as const;

/**
 * `<picture>` source descriptors for a backdrop asset: one entry per format,
 * each carrying the full width ladder as a srcset string.
 */
export function assetSources(name: string): { type: string; srcset: string }[] {
	const ordered = [...(ASSET_WIDTHS[name] ?? [])].sort((a, b) => b - a);
	return ASSET_FORMATS.map(({ ext, type }) => ({
		type,
		srcset: ordered.map((width) => `${ASSET_BASE}/${name}-${width}.${ext} ${width}w`).join(", "),
	}));
}

/** `<img src>` fallback: the largest width, in the most widely supported format. */
export function assetFallback(name: string): string {
	const widths = ASSET_WIDTHS[name] ?? [];
	return `${ASSET_BASE}/${name}-${Math.max(...widths)}.webp`;
}
