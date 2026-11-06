/**
 * Glyph format of the hand-drawn alphabet (shared core: byte-identical in the Svelte, React and
 * Vue packages, see shared-cores.json).
 *
 * Coordinates are in em, y pointing DOWN, origin on the baseline at the glyph's left edge:
 *   cap height / ascender  y = -0.70
 *   x-height               y = -0.46
 *   baseline               y =  0
 *   descender              y = +0.24
 * A math axis (fraction bar, minus, centre of + and =) sits at y = -0.25.
 *
 * Each stroke is one pen-down → pen-up gesture, listed in WRITING ORDER (the order a person
 * writes it), its points in drawing direction. Points are sparse control points (about one every
 * 0.05–0.1 em along curves, fewer on straight lines); the core smooths them (Catmull-Rom) and
 * derives pressure, so do not pre-smooth or add width. Write loosely, like a quick ballpoint hand,
 * not a typeface: slight slants and open joins are welcome, mechanical symmetry is not.
 */
export type Point = readonly [x: number, y: number];
export type Stroke = readonly Point[];

export interface Glyph {
	/** Advance width in em, including a little side bearing (about 0.06 em per side). */
	adv: number;
	/** Pen strokes in writing order. Empty for a space. */
	strokes: readonly Stroke[];
}

export type GlyphTable = Readonly<Record<string, Glyph>>;
