/**
 * Shared stroke types and the few shapes the layout draws itself when the glyph table has none
 * (shared core: byte-identical in the Svelte, React and Vue packages). Units: em, y down.
 */
import type { Glyph, GlyphTable } from "./handwrite-glyph-types.js";

export type Vec = [number, number];

export type StrokeKind = "ink" | "rule" | "bubble";

/** One pen-down → pen-up gesture, positioned. */
export interface LaidStroke {
	points: Vec[];
	kind: StrokeKind;
	/** Glyph the stroke belongs to (strokes of one glyph share it; the pen lifts briefly between them). */
	glyph: number;
	/** True on the first stroke written after a space. */
	afterSpace: boolean;
	/** Centre of the glyph on its baseline, for the per-glyph hand variation. */
	anchor: Vec;
	/** Size of the glyph relative to the body text (1 = normal, 0.62 = script). */
	scale: number;
}

export interface BBox {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
}

export function emptyBBox(): BBox {
	return { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
}

export function growBBox(box: BBox, points: readonly (readonly [number, number])[]): BBox {
	for (const [x, y] of points) {
		if (x < box.minX) box.minX = x;
		if (y < box.minY) box.minY = y;
		if (x > box.maxX) box.maxX = x;
		if (y > box.maxY) box.maxY = y;
	}
	return box;
}

/** Stroke length, in the stroke's own units. */
export function strokeLength(points: readonly (readonly [number, number])[]): number {
	let len = 0;
	for (let i = 1; i < points.length; i++) {
		len += Math.hypot(points[i]![0] - points[i - 1]![0], points[i]![1] - points[i - 1]![1]);
	}
	return len;
}

/** Fallback shapes for the stretchy delimiters and the radical, in glyph format. */
const FALLBACK: GlyphTable = {
	"(": {
		adv: 0.3,
		strokes: [[[0.24, -0.72], [0.13, -0.56], [0.08, -0.25], [0.12, 0.06], [0.23, 0.24]]],
	},
	")": {
		adv: 0.3,
		strokes: [[[0.07, -0.72], [0.17, -0.56], [0.22, -0.25], [0.18, 0.06], [0.07, 0.24]]],
	},
	"[": {
		adv: 0.3,
		strokes: [[[0.23, -0.71], [0.1, -0.72], [0.09, -0.25], [0.1, 0.23], [0.24, 0.24]]],
	},
	"]": {
		adv: 0.3,
		strokes: [[[0.06, -0.72], [0.2, -0.71], [0.21, -0.25], [0.2, 0.24], [0.06, 0.23]]],
	},
	"|": { adv: 0.2, strokes: [[[0.11, -0.72], [0.1, -0.25], [0.09, 0.24]]] },
	"‖": {
		adv: 0.3,
		strokes: [
			[[0.1, -0.72], [0.09, 0.24]],
			[[0.2, -0.72], [0.19, 0.24]],
		],
	},
	"{": {
		adv: 0.32,
		strokes: [[[0.26, -0.72], [0.16, -0.66], [0.16, -0.32], [0.07, -0.25], [0.16, -0.18], [0.16, 0.18], [0.26, 0.24]]],
	},
	"}": {
		adv: 0.32,
		strokes: [[[0.06, -0.72], [0.16, -0.66], [0.16, -0.32], [0.25, -0.25], [0.16, -0.18], [0.16, 0.18], [0.06, 0.24]]],
	},
	"√": {
		adv: 0.5,
		strokes: [[[0.04, -0.3], [0.1, -0.34], [0.2, 0.02], [0.32, -0.55], [0.44, -0.74]]],
	},
};

/** The table's glyph, else the fallback shape, else null. */
export function lookupGlyph(table: GlyphTable, ch: string): Glyph | null {
	return table[ch] ?? FALLBACK[ch] ?? null;
}

export function glyphBBox(glyph: Glyph): BBox {
	const box = emptyBBox();
	for (const s of glyph.strokes) growBBox(box, s);
	return box;
}
