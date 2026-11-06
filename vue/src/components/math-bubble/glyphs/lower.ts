/**
 * Latin lowercase b–z ("a" is in the exemplar), in the exemplar's quick, slightly right-leaning
 * ballpoint print hand: single-storey forms, ascenders to about -0.70, descenders to +0.24;
 * n–z live in lower-nz.ts. Format and metrics: ../handwrite-glyph-types.ts.
 */
import type { GlyphTable } from "../handwrite-glyph-types.js";
import { lowerNZ } from "./lower-nz.js";

export const lower: GlyphTable = {
	// "b": the ascender stem top to bottom, then back up into the bowl, clockwise, closing at the foot.
	b: {
		adv: 0.5,
		strokes: [
			[
				[0.15, -0.7],
				[0.12, -0.36],
				[0.09, 0],
				[0.11, -0.24],
				[0.19, -0.41],
				[0.3, -0.46],
				[0.4, -0.39],
				[0.43, -0.22],
				[0.37, -0.06],
				[0.25, 0],
				[0.13, -0.03],
			],
		],
	},
	// "c": an open arc counter-clockwise from the top right, ending in a small lift at the bottom right.
	c: {
		adv: 0.44,
		strokes: [
			[
				[0.38, -0.4],
				[0.3, -0.46],
				[0.19, -0.44],
				[0.1, -0.33],
				[0.08, -0.16],
				[0.13, -0.04],
				[0.23, 0],
				[0.33, -0.03],
				[0.39, -0.08],
			],
		],
	},
	// "d": the bowl as in "a", then the stem climbs to the ascender and comes straight back down with a flick.
	d: {
		adv: 0.52,
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
				[0.43, -0.5],
				[0.46, -0.7],
				[0.43, -0.4],
				[0.41, -0.12],
				[0.42, -0.02],
				[0.48, 0.01],
			],
		],
	},
	// "e": the bar left to right first, looping up and over counter-clockwise, then round the bottom.
	e: {
		adv: 0.46,
		strokes: [
			[
				[0.09, -0.23],
				[0.24, -0.25],
				[0.37, -0.28],
				[0.39, -0.37],
				[0.31, -0.46],
				[0.19, -0.45],
				[0.1, -0.34],
				[0.08, -0.16],
				[0.14, -0.04],
				[0.25, 0],
				[0.36, -0.04],
				[0.4, -0.09],
			],
		],
	},
	// "f": a hook at the top right running down the stem to the baseline, then the crossbar.
	f: {
		adv: 0.36,
		strokes: [
			[
				[0.35, -0.64],
				[0.3, -0.7],
				[0.22, -0.69],
				[0.18, -0.58],
				[0.16, -0.3],
				[0.14, 0],
			],
			[
				[0.06, -0.43],
				[0.18, -0.45],
				[0.31, -0.46],
			],
		],
	},
	// "g": the bowl as in "a", then the stem falls below the baseline and hooks back to the left.
	g: {
		adv: 0.5,
		strokes: [
			[
				[0.4, -0.38],
				[0.33, -0.45],
				[0.22, -0.46],
				[0.12, -0.38],
				[0.08, -0.24],
				[0.11, -0.1],
				[0.2, -0.05],
				[0.31, -0.1],
				[0.39, -0.25],
				[0.42, -0.44],
				[0.4, -0.14],
				[0.37, 0.1],
				[0.3, 0.21],
				[0.19, 0.24],
				[0.09, 0.19],
			],
		],
	},
	// "h": the ascender stem down, then back up the stem into the arch and down the right leg with a flick.
	h: {
		adv: 0.5,
		strokes: [
			[
				[0.15, -0.7],
				[0.12, -0.36],
				[0.09, 0],
				[0.11, -0.22],
				[0.18, -0.38],
				[0.28, -0.46],
				[0.37, -0.42],
				[0.4, -0.28],
				[0.39, -0.08],
				[0.44, 0.01],
			],
		],
	},
	// "i": the stem with a little turn at the foot, then the dot as its own short tap.
	i: {
		adv: 0.26,
		strokes: [
			[
				[0.15, -0.45],
				[0.13, -0.22],
				[0.13, -0.05],
				[0.19, 0.01],
			],
			[
				[0.165, -0.635],
				[0.185, -0.605],
			],
		],
	},
	// "j": the stem through the baseline, curling back to the left in the descender, then the dot.
	j: {
		adv: 0.28,
		strokes: [
			[
				[0.2, -0.45],
				[0.19, -0.18],
				[0.17, 0.08],
				[0.13, 0.19],
				[0.06, 0.24],
				[0.01, 0.2],
			],
			[
				[0.215, -0.635],
				[0.235, -0.605],
			],
		],
	},
	// "k": the ascender stem, then one gesture: the arm in to the stem and the leg kicked out to the right.
	k: {
		adv: 0.44,
		strokes: [
			[
				[0.15, -0.7],
				[0.12, -0.36],
				[0.09, 0],
			],
			[
				[0.37, -0.45],
				[0.24, -0.31],
				[0.12, -0.21],
				[0.23, -0.17],
				[0.32, -0.07],
				[0.4, 0],
			],
		],
	},
	// "l": one tall stroke with a small curl to the right at the foot.
	l: {
		adv: 0.26,
		strokes: [
			[
				[0.17, -0.7],
				[0.14, -0.36],
				[0.12, -0.08],
				[0.16, 0],
				[0.22, -0.02],
			],
		],
	},
	// "m": the short stem down, then two arches without lifting, the last leg ending in a flick.
	m: {
		adv: 0.64,
		strokes: [
			[
				[0.08, -0.45],
				[0.07, -0.22],
				[0.06, 0],
				[0.08, -0.24],
				[0.14, -0.4],
				[0.21, -0.46],
				[0.28, -0.42],
				[0.3, -0.26],
				[0.29, 0],
				[0.31, -0.26],
				[0.37, -0.41],
				[0.45, -0.46],
				[0.52, -0.41],
				[0.54, -0.23],
				[0.53, -0.06],
				[0.58, 0.01],
			],
		],
	},
	...lowerNZ,
};
