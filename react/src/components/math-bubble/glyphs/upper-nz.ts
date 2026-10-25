/**
 * Capitals N–Z, second half of upper.ts (split for length). Same hand and metrics.
 */
import type { GlyphTable } from "../handwrite-glyph-types.js";

export const upperNZ: GlyphTable = {
	// "N": one gesture: up the left stem, down the diagonal, up the right stem.
	N: {
		adv: 0.64,
		strokes: [
			[
				[0.08, 0],
				[0.11, -0.36],
				[0.14, -0.67],
				[0.14, -0.7],
				[0.16, -0.67],
				[0.32, -0.36],
				[0.48, -0.03],
				[0.5, 0],
				[0.5, -0.03],
				[0.54, -0.36],
				[0.58, -0.71]
			]
		]
	},
	// "O": one counter-clockwise loop from the top, overshooting a little where it closes.
	O: {
		adv: 0.66,
		strokes: [
			[
				[0.39, -0.7],
				[0.24, -0.66],
				[0.13, -0.53],
				[0.08, -0.34],
				[0.11, -0.15],
				[0.21, -0.02],
				[0.35, 0.01],
				[0.49, -0.05],
				[0.59, -0.19],
				[0.62, -0.37],
				[0.58, -0.56],
				[0.47, -0.68],
				[0.35, -0.7],
				[0.27, -0.67]
			]
		]
	},
	// "P": the stem down, then the bowl from the top closing back on the stem at mid-height.
	P: {
		adv: 0.54,
		strokes: [
			[
				[0.14, -0.7],
				[0.11, -0.35],
				[0.08, 0]
			],
			[
				[0.14, -0.7],
				[0.32, -0.7],
				[0.46, -0.65],
				[0.51, -0.53],
				[0.45, -0.41],
				[0.3, -0.35],
				[0.12, -0.35]
			]
		]
	},
	// "Q": the O loop, then the tail crossing its lower right.
	Q: {
		adv: 0.66,
		strokes: [
			[
				[0.39, -0.7],
				[0.24, -0.66],
				[0.13, -0.53],
				[0.08, -0.34],
				[0.11, -0.15],
				[0.21, -0.02],
				[0.35, 0.01],
				[0.49, -0.05],
				[0.59, -0.19],
				[0.62, -0.37],
				[0.58, -0.56],
				[0.47, -0.68],
				[0.35, -0.7],
				[0.27, -0.67]
			],
			[
				[0.39, -0.18],
				[0.49, -0.07],
				[0.62, 0.04]
			]
		]
	},
	// "R": the stem, then the bowl back to the stem and straight on into the leg.
	R: {
		adv: 0.56,
		strokes: [
			[
				[0.14, -0.7],
				[0.11, -0.35],
				[0.08, 0]
			],
			[
				[0.14, -0.7],
				[0.32, -0.7],
				[0.46, -0.65],
				[0.51, -0.53],
				[0.45, -0.42],
				[0.3, -0.36],
				[0.12, -0.36],
				[0.27, -0.34],
				[0.39, -0.17],
				[0.51, 0.01]
			]
		]
	},
	// "S": one gesture from the top right: the upper curl to the left, the spine, the lower curl.
	S: {
		adv: 0.54,
		strokes: [
			[
				[0.49, -0.62],
				[0.4, -0.69],
				[0.27, -0.7],
				[0.15, -0.64],
				[0.13, -0.52],
				[0.2, -0.42],
				[0.34, -0.36],
				[0.45, -0.28],
				[0.48, -0.15],
				[0.39, -0.03],
				[0.25, 0.01],
				[0.13, -0.03],
				[0.07, -0.11]
			]
		]
	},
	// "T": the top bar first (with a hooked start), then the stem from its middle.
	T: {
		adv: 0.6,
		strokes: [
			[
				[0.06, -0.64],
				[0.1, -0.69],
				[0.31, -0.7],
				[0.55, -0.71]
			],
			[
				[0.32, -0.7],
				[0.29, -0.35],
				[0.25, 0]
			]
		]
	},
	// "U": one gesture: down the left side, round the bottom, up the right side.
	U: {
		adv: 0.62,
		strokes: [
			[
				[0.13, -0.7],
				[0.1, -0.4],
				[0.1, -0.17],
				[0.16, -0.04],
				[0.29, 0.01],
				[0.42, -0.04],
				[0.51, -0.17],
				[0.54, -0.42],
				[0.58, -0.71]
			]
		]
	},
	// "V": one gesture down to the point and back up.
	V: {
		adv: 0.64,
		strokes: [
			[
				[0.09, -0.7],
				[0.19, -0.36],
				[0.27, -0.03],
				[0.28, 0],
				[0.29, -0.03],
				[0.43, -0.36],
				[0.59, -0.71]
			]
		]
	},
	// "W": two Vs in one zig-zag gesture, the middle peak a little short of the cap line.
	W: {
		adv: 0.91,
		strokes: [
			[
				[0.09, -0.7],
				[0.15, -0.35],
				[0.21, -0.03],
				[0.22, 0],
				[0.23, -0.03],
				[0.34, -0.3],
				[0.44, -0.55],
				[0.45, -0.58],
				[0.46, -0.55],
				[0.54, -0.3],
				[0.61, -0.03],
				[0.62, 0],
				[0.63, -0.03],
				[0.73, -0.36],
				[0.85, -0.71]
			]
		]
	},
	// "X": the falling diagonal, then the other one from the top right down to the lower left.
	X: {
		adv: 0.61,
		strokes: [
			[
				[0.11, -0.7],
				[0.31, -0.35],
				[0.52, 0.01]
			],
			[
				[0.56, -0.71],
				[0.31, -0.36],
				[0.06, 0]
			]
		]
	},
	// "Y": the left arm into the stem in one gesture, then the right arm meeting it.
	Y: {
		adv: 0.6,
		strokes: [
			[
				[0.09, -0.7],
				[0.2, -0.52],
				[0.29, -0.36],
				[0.27, -0.18],
				[0.25, 0]
			],
			[
				[0.55, -0.71],
				[0.42, -0.53],
				[0.29, -0.36]
			]
		]
	},
	// "Z": one gesture: top bar, the diagonal back down, the foot.
	Z: {
		adv: 0.6,
		strokes: [
			[
				[0.1, -0.69],
				[0.32, -0.7],
				[0.51, -0.71],
				[0.54, -0.71],
				[0.51, -0.68],
				[0.31, -0.36],
				[0.09, -0.03],
				[0.07, 0],
				[0.11, 0],
				[0.28, 0],
				[0.5, -0.01]
			]
		]
	}
};
