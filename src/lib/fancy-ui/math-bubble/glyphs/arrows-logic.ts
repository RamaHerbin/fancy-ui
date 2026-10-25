/**
 * Arrows, set and logic symbols, in the hand of exemplar.ts; merged into digitsSymbols by
 * digits-symbols.ts. Arrows and set signs centre on the math axis (y = -0.25), quantifiers stand
 * at cap height. Format and metrics: ../handwrite-glyph-types.ts.
 */
import type { GlyphTable } from "../handwrite-glyph-types.js";

export const arrowsLogic: GlyphTable = {
	// "→": the shaft left to right, then the head in one gesture through the tip.
	"→": {
		adv: 0.66,
		strokes: [
			[
				[0.07, -0.24],
				[0.32, -0.24],
				[0.58, -0.26]
			],
			[
				[0.46, -0.35],
				[0.53, -0.3],
				[0.59, -0.26],
				[0.51, -0.2],
				[0.45, -0.14]
			]
		]
	},
	// "⇒": the upper rail, the lower rail, then a wide head over both.
	"⇒": {
		adv: 0.7,
		strokes: [
			[
				[0.07, -0.32],
				[0.3, -0.33],
				[0.53, -0.33]
			],
			[
				[0.07, -0.17],
				[0.3, -0.18],
				[0.53, -0.18]
			],
			[
				[0.45, -0.44],
				[0.62, -0.26],
				[0.45, -0.07]
			]
		]
	},
	// "↦": the short upright tail, then the arrow as for "→".
	"↦": {
		adv: 0.68,
		strokes: [
			[
				[0.08, -0.35],
				[0.08, -0.25],
				[0.08, -0.14]
			],
			[
				[0.09, -0.25],
				[0.34, -0.25],
				[0.6, -0.26]
			],
			[
				[0.49, -0.36],
				[0.61, -0.26],
				[0.48, -0.15]
			]
		]
	},
	// "∈": a round "C" counter-clockwise from the top right, then the middle bar.
	"∈": {
		adv: 0.48,
		strokes: [
			[
				[0.41, -0.46],
				[0.26, -0.47],
				[0.14, -0.42],
				[0.08, -0.3],
				[0.09, -0.16],
				[0.17, -0.06],
				[0.28, -0.03],
				[0.41, -0.04]
			],
			[
				[0.09, -0.25],
				[0.25, -0.25],
				[0.38, -0.26]
			]
		]
	},
	// "∉": the "∈", then a slash struck down through it.
	"∉": {
		adv: 0.48,
		strokes: [
			[
				[0.41, -0.46],
				[0.26, -0.47],
				[0.14, -0.42],
				[0.08, -0.3],
				[0.09, -0.16],
				[0.17, -0.06],
				[0.28, -0.03],
				[0.41, -0.04]
			],
			[
				[0.09, -0.25],
				[0.25, -0.25],
				[0.38, -0.26]
			],
			[
				[0.34, -0.58],
				[0.25, -0.26],
				[0.15, 0.07]
			]
		]
	},
	// "⊂": a horseshoe opening right, counter-clockwise from the top right.
	"⊂": {
		adv: 0.48,
		strokes: [
			[
				[0.42, -0.44],
				[0.24, -0.44],
				[0.13, -0.4],
				[0.08, -0.29],
				[0.09, -0.18],
				[0.16, -0.09],
				[0.26, -0.06],
				[0.42, -0.06]
			]
		]
	},
	// "∀": down the left leg to the point and up the right in one gesture, then the bar.
	"∀": {
		adv: 0.56,
		strokes: [
			[
				[0.07, -0.7],
				[0.17, -0.35],
				[0.27, 0],
				[0.37, -0.35],
				[0.48, -0.71]
			],
			[
				[0.14, -0.43],
				[0.28, -0.43],
				[0.42, -0.45]
			]
		]
	},
	// "∃": the top bar, down the back and out along the foot, then the middle arm.
	"∃": {
		adv: 0.48,
		strokes: [
			[
				[0.08, -0.68],
				[0.24, -0.69],
				[0.372, -0.7],
				[0.388, -0.686],
				[0.384, -0.35],
				[0.38, -0.016],
				[0.365, 0],
				[0.22, 0],
				[0.07, 0.01]
			],
			[
				[0.12, -0.35],
				[0.25, -0.35],
				[0.37, -0.36]
			]
		]
	}
};
