/**
 * MathBubble engine — framework-free, byte-identical in the Svelte, React and Vue trees (see
 * shared-cores.json). A comic bubble that draws itself, then a formula written inside it by hand.
 *
 *   parse (mini-TeX) → layout (em boxes) → bubble outline → hand (variation, smoothing,
 *   pressure) → timeline (who writes when) → draw (canvas frame or static SVG)
 *
 * Everything is a pure function of the formula, the options and the time: no browser global is
 * touched, nothing random outside the seeded generator, so the server and the browser agree.
 */
import type { GlyphTable } from "./handwrite-glyph-types.js";
import { glyphs as defaultGlyphs } from "./glyphs/index.js";
import { buildBubble, type BubbleKind, type TailSide } from "./handwrite-bubble.js";
import { drawFrame, toSvgPaths, type PenContext, type SvgStroke } from "./handwrite-draw.js";
import { inkStrokes, type InkStroke } from "./handwrite-hand.js";
import { layoutFormula } from "./handwrite-layout.js";
import { parseFormula } from "./handwrite-parse.js";
import { seedFromString } from "./handwrite-prng.js";
import type { BBox } from "./handwrite-shapes.js";
import { buildTimeline, frameAt, type Frame, type Timeline } from "./handwrite-timeline.js";

export interface MathBubbleOptions {
	bubble?: BubbleKind;
	tail?: TailSide;
	/** Where the tail leaves its side, 0..1. */
	tailOffset?: number;
	/** Writing speed, em per second. */
	speed?: number;
	/** Seed of the hand; defaults to a hash of the formula. */
	seed?: number;
	/** px per em. */
	size?: number;
	/** Base pen width, px. */
	strokeWidth?: number;
	/** Space between the formula and the bubble, em. */
	padding?: number;
	/** Ink colour for `draw`. */
	color?: string;
	/** Rest on the finished frame before the next formula, ms. */
	hold?: number;
	/** Glyph table override (tests, custom alphabets). */
	glyphs?: GlyphTable;
}

export interface MathBubbleSvg {
	width: number;
	height: number;
	viewBox: string;
	paths: SvgStroke[];
}

export interface MathBubble {
	/** Bubble strokes first, then the formula's, in writing order (em). */
	strokes: InkStroke[];
	/** Extent of the whole drawing, em. */
	bbox: BBox;
	/** Canvas size the drawing needs, px. */
	size: { width: number; height: number };
	timeline: Timeline;
	frameAt(t: number): Frame;
	/** Draws the frame at `t` ms; the caller clears the canvas first. */
	draw(ctx: PenContext, t: number): void;
	/** The finished drawing as SVG path data. */
	svg(): MathBubbleSvg;
}

export const MATH_BUBBLE_DEFAULTS = {
	bubble: "speech" as BubbleKind,
	tail: "bottom" as TailSide,
	tailOffset: 0.25,
	speed: 5,
	size: 32,
	strokeWidth: 2,
	padding: 0.35,
	color: "#111111",
	hold: 2000,
};

function positive(v: number | undefined, fallback: number): number {
	return v !== undefined && Number.isFinite(v) && v > 0 ? v : fallback;
}

export function createMathBubble(formula: string, opts: MathBubbleOptions = {}): MathBubble {
	const d = MATH_BUBBLE_DEFAULTS;
	const size = positive(opts.size, d.size);
	const strokeWidth = positive(opts.strokeWidth, d.strokeWidth);
	const seed = (opts.seed ?? seedFromString(formula)) >>> 0;
	const layout = layoutFormula(parseFormula(formula), opts.glyphs ?? defaultGlyphs);
	const bubble = buildBubble(layout.bbox, {
		kind: opts.bubble ?? d.bubble,
		tail: opts.tail ?? d.tail,
		tailOffset: opts.tailOffset ?? d.tailOffset,
		padding: opts.padding !== undefined && opts.padding >= 0 ? opts.padding : d.padding,
		seed,
	});
	const strokes = inkStrokes([...bubble.strokes, ...layout.strokes], { seed, pxPerEm: size });
	const bbox: BBox = { ...bubble.bbox };
	for (const s of strokes) {
		for (const [x, y] of s.points) {
			bbox.minX = Math.min(bbox.minX, x);
			bbox.minY = Math.min(bbox.minY, y);
			bbox.maxX = Math.max(bbox.maxX, x);
			bbox.maxY = Math.max(bbox.maxY, y);
		}
	}
	// A margin of a pen width keeps round caps inside the canvas.
	const margin = strokeWidth * 1.5;
	const style = {
		color: opts.color ?? d.color,
		strokeWidth,
		scale: size,
		offsetX: margin - bbox.minX * size,
		offsetY: margin - bbox.minY * size,
	};
	const px = {
		width: Math.ceil((bbox.maxX - bbox.minX) * size + 2 * margin),
		height: Math.ceil((bbox.maxY - bbox.minY) * size + 2 * margin),
	};
	const timeline = buildTimeline(strokes, { speed: positive(opts.speed, d.speed), hold: opts.hold ?? d.hold });
	return {
		strokes,
		bbox,
		size: px,
		timeline,
		frameAt: (t) => frameAt(timeline, t),
		draw: (ctx, t) => drawFrame(ctx, frameAt(timeline, t), style),
		svg: () => ({
			width: px.width,
			height: px.height,
			viewBox: `0 0 ${px.width} ${px.height}`,
			paths: toSvgPaths(strokes, style),
		}),
	};
}
