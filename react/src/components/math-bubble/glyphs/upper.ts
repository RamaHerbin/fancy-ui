/**
 * Latin capitals A–Z and the space, in the hand of exemplar.ts: simple print capitals, a little
 * loose and right-leaning, cap height -0.70; N–Z live in upper-nz.ts. Format and metrics:
 * ../handwrite-glyph-types.ts.
 */
import type { GlyphTable } from "../handwrite-glyph-types.js";
import { upperNZ } from "./upper-nz.js";

export const upper: GlyphTable = {
	// " ": no ink, only the advance.
	" ": { adv: 0.3, strokes: [] },
	// "A": up-and-down in one gesture (left leg up to the apex, right leg down), then the crossbar.
	A: {
		adv: 0.62,
		strokes: [
			[
				[0.06, 0],
				[0.19, -0.34],
				[0.32, -0.67],
				[0.34, -0.7],
				[0.34, -0.67],
				[0.45, -0.34],
				[0.56, 0.01]
			],
			[
				[0.16, -0.24],
				[0.31, -0.26],
				[0.47, -0.27]
			]
		]
	},
	// "B": the stem down, then both bowls in one gesture from the top, the lower one wider.
	B: {
		adv: 0.56,
		strokes: [
			[
				[0.13, -0.69],
				[0.11, -0.35],
				[0.08, 0]
			],
			[
				[0.13, -0.69],
				[0.32, -0.7],
				[0.44, -0.65],
				[0.47, -0.55],
				[0.41, -0.43],
				[0.26, -0.38],
				[0.13, -0.38],
				[0.32, -0.37],
				[0.47, -0.31],
				[0.51, -0.19],
				[0.45, -0.06],
				[0.3, 0],
				[0.08, 0]
			]
		]
	},
	// "C": one counter-clockwise arc from the upper right, open at the right.
	C: {
		adv: 0.6,
		strokes: [
			[
				[0.56, -0.6],
				[0.47, -0.68],
				[0.36, -0.7],
				[0.21, -0.64],
				[0.12, -0.5],
				[0.08, -0.32],
				[0.11, -0.14],
				[0.21, -0.02],
				[0.35, 0.01],
				[0.47, -0.04],
				[0.55, -0.12]
			]
		]
	},
	// "D": the stem down, then the bow from the top round to the foot.
	D: {
		adv: 0.62,
		strokes: [
			[
				[0.14, -0.7],
				[0.11, -0.35],
				[0.08, 0]
			],
			[
				[0.14, -0.7],
				[0.3, -0.69],
				[0.46, -0.62],
				[0.55, -0.47],
				[0.57, -0.3],
				[0.51, -0.14],
				[0.38, -0.03],
				[0.22, 0],
				[0.07, 0]
			]
		]
	},
	// "E": the top bar, down the stem and along the foot in one gesture, then the middle bar.
	E: {
		adv: 0.52,
		strokes: [
			[
				[0.49, -0.7],
				[0.31, -0.7],
				[0.17, -0.69],
				[0.14, -0.69],
				[0.14, -0.66],
				[0.11, -0.35],
				[0.08, -0.03],
				[0.08, 0],
				[0.12, 0],
				[0.27, 0],
				[0.46, -0.01]
			],
			[
				[0.12, -0.37],
				[0.26, -0.37],
				[0.39, -0.38]
			]
		]
	},
	// "F": the stem down, then the top bar, then a shorter middle bar.
	F: {
		adv: 0.53,
		strokes: [
			[
				[0.14, -0.69],
				[0.11, -0.35],
				[0.08, 0]
			],
			[
				[0.14, -0.69],
				[0.32, -0.7],
				[0.48, -0.71]
			],
			[
				[0.12, -0.37],
				[0.25, -0.37],
				[0.37, -0.38]
			]
		]
	},
	// "G": the C arc carried on into a short inward bar, the pen not lifting.
	G: {
		adv: 0.64,
		strokes: [
			[
				[0.57, -0.6],
				[0.48, -0.68],
				[0.36, -0.7],
				[0.21, -0.64],
				[0.12, -0.5],
				[0.08, -0.32],
				[0.11, -0.14],
				[0.21, -0.02],
				[0.36, 0.01],
				[0.49, -0.05],
				[0.57, -0.16],
				[0.59, -0.3],
				[0.49, -0.3],
				[0.38, -0.29]
			]
		]
	},
	// "H": the left stem, the right stem, then the crossbar.
	H: {
		adv: 0.62,
		strokes: [
			[
				[0.14, -0.7],
				[0.11, -0.35],
				[0.08, 0]
			],
			[
				[0.57, -0.71],
				[0.54, -0.35],
				[0.5, 0]
			],
			[
				[0.12, -0.36],
				[0.32, -0.37],
				[0.57, -0.39]
			]
		]
	},
	// "I": a single stem, no serifs.
	I: {
		adv: 0.26,
		strokes: [
			[
				[0.19, -0.7],
				[0.15, -0.35],
				[0.11, 0]
			]
		]
	},
	// "J": down from the top and hooked to the left at the foot.
	J: {
		adv: 0.46,
		strokes: [
			[
				[0.41, -0.7],
				[0.39, -0.4],
				[0.36, -0.14],
				[0.29, -0.03],
				[0.19, 0.01],
				[0.1, -0.03],
				[0.07, -0.12]
			]
		]
	},
	// "K": the stem, then the upper arm into the leg in one gesture (pen touches the stem).
	K: {
		adv: 0.56,
		strokes: [
			[
				[0.14, -0.7],
				[0.11, -0.35],
				[0.08, 0]
			],
			[
				[0.52, -0.71],
				[0.31, -0.5],
				[0.12, -0.31],
				[0.24, -0.38],
				[0.37, -0.2],
				[0.51, 0.01]
			]
		]
	},
	// "L": the stem down and the foot to the right in one gesture.
	L: {
		adv: 0.48,
		strokes: [
			[
				[0.14, -0.7],
				[0.11, -0.35],
				[0.08, -0.03],
				[0.08, 0],
				[0.12, 0],
				[0.26, 0],
				[0.44, -0.01]
			]
		]
	},
	// "M": one gesture: up the left side, down to the middle valley, up and down the right side.
	M: {
		adv: 0.76,
		strokes: [
			[
				[0.07, 0],
				[0.11, -0.36],
				[0.15, -0.67],
				[0.16, -0.7],
				[0.16, -0.67],
				[0.27, -0.42],
				[0.36, -0.23],
				[0.38, -0.2],
				[0.4, -0.23],
				[0.52, -0.43],
				[0.65, -0.68],
				[0.68, -0.71],
				[0.67, -0.68],
				[0.68, -0.35],
				[0.67, 0]
			]
		]
	},
	...upperNZ
};
