/**
 * Lowercase n–z, second half of lower.ts (split for length). Same hand and metrics.
 */
import type { GlyphTable } from "../handwrite-glyph-types.js";

export const lowerNZ: GlyphTable = {
	// "n": the short stem down, then back up into one arch and down the right leg with a flick.
	n: {
		adv: 0.48,
		strokes: [
			[
				[0.09, -0.45],
				[0.08, -0.22],
				[0.07, 0],
				[0.09, -0.24],
				[0.16, -0.39],
				[0.26, -0.46],
				[0.35, -0.42],
				[0.38, -0.27],
				[0.37, -0.07],
				[0.42, 0.01],
			],
		],
	},
	// "o": counter-clockwise from the top, closing with a slight overlap past the start.
	o: {
		adv: 0.48,
		strokes: [
			[
				[0.27, -0.46],
				[0.16, -0.43],
				[0.09, -0.3],
				[0.08, -0.13],
				[0.15, -0.02],
				[0.25, 0],
				[0.36, -0.07],
				[0.41, -0.23],
				[0.38, -0.39],
				[0.3, -0.46],
				[0.22, -0.45],
			],
		],
	},
	// "p": the stem from the x-height into the descender, then back up into a clockwise bowl.
	p: {
		adv: 0.48,
		strokes: [
			[
				[0.12, -0.45],
				[0.1, -0.1],
				[0.07, 0.24],
				[0.09, -0.06],
				[0.11, -0.24],
				[0.18, -0.4],
				[0.29, -0.46],
				[0.39, -0.39],
				[0.42, -0.22],
				[0.36, -0.06],
				[0.24, 0],
				[0.12, -0.04],
			],
		],
	},
	// "q": the bowl as in "a", then the stem down into the descender with a small flick to the right.
	q: {
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
				[0.39, -0.22],
				[0.42, -0.44],
				[0.4, -0.12],
				[0.38, 0.24],
				[0.45, 0.17],
			],
		],
	},
	// "r": the short stem down, then back up and out into a shoulder that stops short.
	r: {
		adv: 0.36,
		strokes: [
			[
				[0.1, -0.45],
				[0.08, -0.2],
				[0.07, 0],
				[0.09, -0.24],
				[0.15, -0.38],
				[0.24, -0.46],
				[0.33, -0.44],
			],
		],
	},
	// "s": from the top right, round the upper curve, across the spine, and round the lower curve to the left.
	s: {
		adv: 0.42,
		strokes: [
			[
				[0.37, -0.41],
				[0.29, -0.46],
				[0.17, -0.45],
				[0.1, -0.37],
				[0.15, -0.28],
				[0.28, -0.23],
				[0.37, -0.14],
				[0.32, -0.03],
				[0.19, 0],
				[0.07, -0.06],
			],
		],
	},
	// "t": the shorter stem down with a curl to the right at the foot, then the crossbar.
	t: {
		adv: 0.36,
		strokes: [
			[
				[0.19, -0.6],
				[0.17, -0.3],
				[0.15, -0.07],
				[0.2, 0],
				[0.29, -0.04],
			],
			[
				[0.06, -0.43],
				[0.19, -0.44],
				[0.32, -0.46],
			],
		],
	},
	// "u": down and round the bottom, up to the x-height, then straight down the stem with a flick.
	u: {
		adv: 0.5,
		strokes: [
			[
				[0.08, -0.45],
				[0.07, -0.2],
				[0.11, -0.05],
				[0.2, 0],
				[0.3, -0.06],
				[0.38, -0.2],
				[0.41, -0.45],
				[0.39, -0.2],
				[0.39, -0.05],
				[0.45, 0.01],
			],
		],
	},
	// "v": down to a slightly rounded point and back up, the right arm ending in a small outward tick.
	v: {
		adv: 0.44,
		strokes: [
			[
				[0.06, -0.45],
				[0.13, -0.24],
				[0.19, -0.02],
				[0.22, -0.02],
				[0.3, -0.24],
				[0.36, -0.41],
				[0.41, -0.46],
			],
		],
	},
	// "w": two "v"s in one gesture, the middle peak lower than the outer arms.
	w: {
		adv: 0.62,
		strokes: [
			[
				[0.06, -0.45],
				[0.11, -0.22],
				[0.16, -0.01],
				[0.18, -0.01],
				[0.25, -0.2],
				[0.3, -0.34],
				[0.35, -0.18],
				[0.4, -0.01],
				[0.42, -0.01],
				[0.49, -0.25],
				[0.56, -0.46],
			],
		],
	},
	// "x": two strokes, top left to bottom right, then top right to bottom left.
	x: {
		adv: 0.44,
		strokes: [
			[
				[0.07, -0.45],
				[0.2, -0.24],
				[0.36, 0],
			],
			[
				[0.38, -0.46],
				[0.22, -0.22],
				[0.06, 0],
			],
		],
	},
	// "y": the short left arm, then the long right arm through the baseline, curling left in the descender.
	y: {
		adv: 0.46,
		strokes: [
			[
				[0.07, -0.45],
				[0.14, -0.25],
				[0.23, -0.06],
			],
			[
				[0.41, -0.46],
				[0.33, -0.22],
				[0.24, 0.02],
				[0.16, 0.17],
				[0.08, 0.24],
				[0.03, 0.21],
			],
		],
	},
	// "z": one gesture: the top bar, the diagonal back down to the left, then the bottom bar.
	z: {
		adv: 0.46,
		strokes: [
			[
				[0.08, -0.44],
				[0.22, -0.45],
				[0.38, -0.46],
				[0.24, -0.26],
				[0.08, -0.01],
				[0.22, 0],
				[0.4, -0.02],
			],
		],
	},
};
