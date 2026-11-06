/**
 * Digits, punctuation and operators, in the hand of exemplar.ts: figures stand at y = -0.66,
 * operators sit on the math axis (y = -0.25), fences span about -0.74 to +0.2.
 * Format and metrics: ../handwrite-glyph-types.ts.
 */
import type { GlyphTable } from "../handwrite-glyph-types.js";
import { arrowsLogic } from "./arrows-logic.js";
import { punctFences } from "./punct-fences.js";

export const digitsSymbols: GlyphTable = {
	// Arrows, ∈ ∉ ⊂ ∀ ∃, then punctuation and fences: in their own files to keep this one readable.
	...arrowsLogic,
	...punctFences,
	// "0": one oval counter-clockwise from the top, closing with a slight overlap.
	"0": {
		adv: 0.5,
		strokes: [
			[
				[0.3, -0.66],
				[0.18, -0.62],
				[0.1, -0.46],
				[0.08, -0.24],
				[0.13, -0.06],
				[0.24, 0],
				[0.35, -0.05],
				[0.42, -0.22],
				[0.43, -0.44],
				[0.39, -0.6],
				[0.3, -0.66],
				[0.23, -0.62]
			]
		]
	},
	// "2": a hook over the top, the diagonal down to the left, then the base along the line.
	"2": {
		adv: 0.5,
		strokes: [
			[
				[0.08, -0.52],
				[0.14, -0.62],
				[0.25, -0.66],
				[0.36, -0.62],
				[0.4, -0.5],
				[0.35, -0.36],
				[0.22, -0.18],
				[0.08, 0],
				[0.2, -0.01],
				[0.34, 0],
				[0.45, -0.02]
			]
		]
	},
	// "3": two bumps opening left, the pen touching in at the waist between them.
	"3": {
		adv: 0.48,
		strokes: [
			[
				[0.08, -0.58],
				[0.16, -0.65],
				[0.28, -0.66],
				[0.37, -0.59],
				[0.36, -0.46],
				[0.26, -0.38],
				[0.18, -0.37],
				[0.3, -0.34],
				[0.4, -0.24],
				[0.39, -0.1],
				[0.29, -0.01],
				[0.16, 0],
				[0.07, -0.06]
			]
		]
	},
	// "4": the slanted arm and the crossbar in one gesture, then the stem down through it.
	"4": {
		adv: 0.5,
		strokes: [
			[
				[0.3, -0.66],
				[0.18, -0.44],
				[0.07, -0.21],
				[0.25, -0.21],
				[0.46, -0.23]
			],
			[
				[0.37, -0.52],
				[0.35, -0.24],
				[0.34, 0]
			]
		]
	},
	// "5": down the neck and round the belly, then the flag across the top.
	"5": {
		adv: 0.48,
		strokes: [
			[
				[0.14, -0.65],
				[0.12, -0.5],
				[0.1, -0.37],
				[0.2, -0.41],
				[0.31, -0.39],
				[0.39, -0.29],
				[0.39, -0.14],
				[0.3, -0.03],
				[0.18, 0],
				[0.07, -0.05]
			],
			[
				[0.14, -0.65],
				[0.27, -0.66],
				[0.42, -0.68]
			]
		]
	},
	// "6": a falling curve from the top right into the bowl, closed at the waist.
	"6": {
		adv: 0.48,
		strokes: [
			[
				[0.37, -0.64],
				[0.27, -0.66],
				[0.17, -0.56],
				[0.1, -0.38],
				[0.08, -0.18],
				[0.14, -0.04],
				[0.25, 0],
				[0.36, -0.05],
				[0.4, -0.18],
				[0.35, -0.31],
				[0.23, -0.35],
				[0.12, -0.27]
			]
		]
	},
	// "7": the top bar, then a sharp turn into a slightly bowed diagonal.
	"7": {
		adv: 0.46,
		strokes: [
			[
				[0.07, -0.64],
				[0.24, -0.66],
				[0.41, -0.67],
				[0.32, -0.46],
				[0.24, -0.24],
				[0.19, 0]
			]
		]
	},
	// "8": from the top right, an S down to the bottom, then back up through the waist to close.
	"8": {
		adv: 0.48,
		strokes: [
			[
				[0.36, -0.6],
				[0.26, -0.66],
				[0.15, -0.62],
				[0.13, -0.5],
				[0.24, -0.38],
				[0.37, -0.27],
				[0.4, -0.12],
				[0.31, -0.01],
				[0.19, -0.01],
				[0.09, -0.1],
				[0.12, -0.25],
				[0.25, -0.37],
				[0.35, -0.48],
				[0.36, -0.6]
			]
		]
	},
	// "9": the head counter-clockwise from the top right, then the tail straight down.
	"9": {
		adv: 0.48,
		strokes: [
			[
				[0.38, -0.58],
				[0.3, -0.66],
				[0.18, -0.65],
				[0.1, -0.55],
				[0.12, -0.42],
				[0.22, -0.36],
				[0.33, -0.41],
				[0.39, -0.56],
				[0.38, -0.32],
				[0.34, -0.12],
				[0.3, 0]
			]
		]
	},
	// "+": the bar left to right, then the upright top to bottom.
	"+": {
		adv: 0.54,
		strokes: [
			[
				[0.08, -0.24],
				[0.27, -0.25],
				[0.46, -0.27]
			],
			[
				[0.28, -0.44],
				[0.27, -0.25],
				[0.26, -0.06]
			]
		]
	},
	// "−": one bar, rising a hair.
	"−": {
		adv: 0.5,
		strokes: [
			[
				[0.08, -0.24],
				[0.25, -0.25],
				[0.42, -0.26]
			]
		]
	},
	// "×": the falling diagonal, then the rising one from the top right.
	"×": {
		adv: 0.46,
		strokes: [
			[
				[0.1, -0.41],
				[0.22, -0.27],
				[0.37, -0.11]
			],
			[
				[0.36, -0.41],
				[0.23, -0.25],
				[0.1, -0.09]
			]
		]
	},
	// "·": a dot tapped on the axis.
	"·": {
		adv: 0.24,
		strokes: [
			[
				[0.105, -0.27],
				[0.14, -0.24]
			]
		]
	},
	// "=": the upper bar, then the lower, a touch shorter.
	"=": {
		adv: 0.52,
		strokes: [
			[
				[0.08, -0.32],
				[0.26, -0.33],
				[0.44, -0.34]
			],
			[
				[0.09, -0.17],
				[0.27, -0.18],
				[0.43, -0.19]
			]
		]
	},
	// "≠": the equals, then a slash struck down through it.
	"≠": {
		adv: 0.52,
		strokes: [
			[
				[0.08, -0.32],
				[0.26, -0.33],
				[0.44, -0.34]
			],
			[
				[0.09, -0.17],
				[0.27, -0.18],
				[0.43, -0.19]
			],
			[
				[0.35, -0.47],
				[0.26, -0.26],
				[0.17, -0.04]
			]
		]
	},
	// "<": in to the point on the left and back out, one gesture.
	"<": {
		adv: 0.48,
		strokes: [
			[
				[0.4, -0.43],
				[0.24, -0.34],
				[0.08, -0.25],
				[0.24, -0.17],
				[0.4, -0.08]
			]
		]
	},
	// ">": out to the point on the right and back, one gesture.
	">": {
		adv: 0.48,
		strokes: [
			[
				[0.08, -0.43],
				[0.24, -0.34],
				[0.4, -0.25],
				[0.24, -0.17],
				[0.08, -0.08]
			]
		]
	},
	// "≤": the angle raised a little, then the bar underneath.
	"≤": {
		adv: 0.48,
		strokes: [
			[
				[0.4, -0.48],
				[0.24, -0.4],
				[0.08, -0.32],
				[0.24, -0.25],
				[0.4, -0.17]
			],
			[
				[0.08, -0.06],
				[0.24, -0.06],
				[0.4, -0.07]
			]
		]
	},
	// "≥": the angle raised a little, then the bar underneath.
	"≥": {
		adv: 0.48,
		strokes: [
			[
				[0.08, -0.48],
				[0.24, -0.4],
				[0.4, -0.32],
				[0.24, -0.25],
				[0.08, -0.17]
			],
			[
				[0.08, -0.07],
				[0.24, -0.06],
				[0.4, -0.06]
			]
		]
	},
	// "≈": two loose waves, upper then lower.
	"≈": {
		adv: 0.52,
		strokes: [
			[
				[0.08, -0.29],
				[0.15, -0.35],
				[0.24, -0.32],
				[0.32, -0.28],
				[0.41, -0.33],
				[0.44, -0.36]
			],
			[
				[0.08, -0.15],
				[0.15, -0.21],
				[0.24, -0.18],
				[0.32, -0.14],
				[0.41, -0.19],
				[0.44, -0.22]
			]
		]
	},
	// "±": a plus sitting high, then the bar under it.
	"±": {
		adv: 0.52,
		strokes: [
			[
				[0.08, -0.33],
				[0.26, -0.34],
				[0.44, -0.35]
			],
			[
				[0.27, -0.5],
				[0.26, -0.34],
				[0.25, -0.18]
			],
			[
				[0.08, -0.06],
				[0.26, -0.07],
				[0.44, -0.08]
			]
		]
	}
};
