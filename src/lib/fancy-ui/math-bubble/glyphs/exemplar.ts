/**
 * Exemplar glyphs, written by hand to set the style every other glyph file matches:
 * a quick, slightly right-leaning ballpoint hand, open joins, one gesture per stroke.
 * Format and metrics: ../handwrite-glyph-types.ts.
 */
import type { GlyphTable } from "../handwrite-glyph-types.js";

export const exemplar: GlyphTable = {
	// "a": one gesture: the bowl counter-clockwise from the top right, then straight down the stem
	// with a small flick at the foot (the pen does not lift).
	a: {
		adv: 0.5,
		strokes: [
			[
				[0.4, -0.38],
				[0.33, -0.45],
				[0.22, -0.46],
				[0.12, -0.38],
				[0.07, -0.22],
				[0.1, -0.06],
				[0.2, 0],
				[0.31, -0.06],
				[0.39, -0.2],
				[0.42, -0.44],
				[0.4, -0.2],
				[0.4, -0.05],
				[0.46, 0.01]
			]
		]
	},
	// "1": a short entry tick, then the stem; no foot serif.
	"1": {
		adv: 0.42,
		strokes: [
			[
				[0.1, -0.52],
				[0.22, -0.6],
				[0.29, -0.7],
				[0.26, -0.35],
				[0.23, 0]
			]
		]
	},
	// "π": the bar first (slightly rising, with a hooked start), then the two legs, the left one
	// curling in at the foot, the right one ending in a small outward flick.
	π: {
		adv: 0.62,
		strokes: [
			[
				[0.06, -0.38],
				[0.12, -0.44],
				[0.3, -0.45],
				[0.56, -0.47]
			],
			[
				[0.22, -0.44],
				[0.2, -0.22],
				[0.15, -0.06],
				[0.09, 0]
			],
			[
				[0.42, -0.45],
				[0.41, -0.2],
				[0.43, -0.04],
				[0.5, 0],
				[0.55, -0.03]
			]
		]
	}
};
