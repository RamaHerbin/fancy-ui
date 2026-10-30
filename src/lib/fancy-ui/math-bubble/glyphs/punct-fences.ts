/**
 * Punctuation and fences, in the hand of exemplar.ts; merged into digitsSymbols by
 * digits-symbols.ts. Dots are short taps (a pure point vanishes at small size); fences span about
 * -0.74 to +0.2 and layout scales them. Corners of "[" "]" "{" "}" are held by two close points,
 * since the core's smoothing rounds any single corner point. Format: ../handwrite-glyph-types.ts.
 */
import type { GlyphTable } from "../handwrite-glyph-types.js";

export const punctFences: GlyphTable = {
	// "/": one stroke from the top right down to the bottom left, a little below the line.
	"/": {
		adv: 0.4,
		strokes: [
			[
				[0.33, -0.72],
				[0.2, -0.33],
				[0.07, 0.08]
			]
		]
	},
	// "|": a long upright, top to bottom, barely leaning.
	"|": {
		adv: 0.22,
		strokes: [
			[
				[0.12, -0.74],
				[0.11, -0.27],
				[0.1, 0.2]
			]
		]
	},
	// ",": a dab on the line trailing down and left.
	",": {
		adv: 0.22,
		strokes: [
			[
				[0.12, -0.04],
				[0.13, 0.01],
				[0.12, 0.06],
				[0.07, 0.13]
			]
		]
	},
	// ".": a dot tapped on the line.
	".": {
		adv: 0.22,
		strokes: [
			[
				[0.09, -0.035],
				[0.125, -0.005]
			]
		]
	},
	// ";": the upper dot, then the comma below it.
	";": {
		adv: 0.24,
		strokes: [
			[
				[0.12, -0.34],
				[0.155, -0.31]
			],
			[
				[0.13, -0.04],
				[0.14, 0.01],
				[0.13, 0.06],
				[0.08, 0.13]
			]
		]
	},
	// ":": two dots, upper then lower.
	":": {
		adv: 0.24,
		strokes: [
			[
				[0.11, -0.34],
				[0.145, -0.31]
			],
			[
				[0.1, -0.035],
				[0.135, -0.005]
			]
		]
	},
	// "!": the stem down, thinning out, then the dot.
	"!": {
		adv: 0.24,
		strokes: [
			[
				[0.14, -0.7],
				[0.13, -0.42],
				[0.12, -0.18]
			],
			[
				[0.1, -0.035],
				[0.135, -0.005]
			]
		]
	},
	// "?": the hook over the top and down into a short stem, then the dot.
	"?": {
		adv: 0.42,
		strokes: [
			[
				[0.07, -0.56],
				[0.13, -0.66],
				[0.24, -0.7],
				[0.34, -0.65],
				[0.36, -0.53],
				[0.29, -0.43],
				[0.21, -0.36],
				[0.2, -0.18]
			],
			[
				[0.18, -0.035],
				[0.215, -0.005]
			]
		]
	},
	// "'": a short upright tick dropping from the cap line.
	"'": {
		adv: 0.18,
		strokes: [
			[
				[0.1, -0.72],
				[0.09, -0.6],
				[0.08, -0.53]
			]
		]
	},
	// "′": a prime, slanting harder down to the left from high up.
	"′": {
		adv: 0.2,
		strokes: [
			[
				[0.15, -0.74],
				[0.1, -0.62],
				[0.06, -0.53]
			]
		]
	},
	// "(": one arc down the left, bowing out a little more at the top.
	"(": {
		adv: 0.3,
		strokes: [
			[
				[0.24, -0.74],
				[0.14, -0.6],
				[0.09, -0.4],
				[0.09, -0.15],
				[0.13, 0.05],
				[0.23, 0.2]
			]
		]
	},
	// ")": the mirror arc down the right.
	")": {
		adv: 0.3,
		strokes: [
			[
				[0.07, -0.74],
				[0.16, -0.6],
				[0.21, -0.4],
				[0.21, -0.15],
				[0.17, 0.05],
				[0.08, 0.2]
			]
		]
	},
	// "[": top serif leftward, down the side, out along the foot, one gesture.
	"[": {
		adv: 0.3,
		strokes: [
			[
				[0.24, -0.745],
				[0.17, -0.742],
				[0.118, -0.74],
				[0.104, -0.726],
				[0.1, -0.5],
				[0.098, -0.15],
				[0.097, 0.186],
				[0.112, 0.2],
				[0.18, 0.199],
				[0.25, 0.195]
			]
		]
	},
	// "]": top serif rightward, down the side, back along the foot.
	"]": {
		adv: 0.3,
		strokes: [
			[
				[0.06, -0.74],
				[0.13, -0.742],
				[0.188, -0.745],
				[0.202, -0.73],
				[0.2, -0.5],
				[0.197, -0.15],
				[0.195, 0.186],
				[0.18, 0.2],
				[0.12, 0.199],
				[0.06, 0.196]
			]
		]
	},
	// "{": from the top right down the spine, a nip out to the left at the axis, on to the foot.
	"{": {
		adv: 0.32,
		strokes: [
			[
				[0.27, -0.74],
				[0.2, -0.71],
				[0.18, -0.6],
				[0.18, -0.4],
				[0.16, -0.31],
				[0.1, -0.27],
				[0.08, -0.265],
				[0.1, -0.255],
				[0.16, -0.22],
				[0.18, -0.14],
				[0.18, 0.07],
				[0.2, 0.17],
				[0.27, 0.2]
			]
		]
	},
	// "}": the mirror of "{", the nip out to the right.
	"}": {
		adv: 0.32,
		strokes: [
			[
				[0.06, -0.74],
				[0.13, -0.71],
				[0.15, -0.6],
				[0.15, -0.4],
				[0.17, -0.31],
				[0.23, -0.27],
				[0.25, -0.265],
				[0.23, -0.255],
				[0.17, -0.22],
				[0.15, -0.14],
				[0.15, 0.07],
				[0.13, 0.17],
				[0.06, 0.2]
			]
		]
	}
};
