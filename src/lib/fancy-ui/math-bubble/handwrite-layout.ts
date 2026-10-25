/**
 * Box layout of the parsed formula into positioned strokes (shared core: byte-identical in the
 * Svelte, React and Vue packages). Units: em, y down, the formula's baseline at y = 0. Strokes
 * come out in writing order: a fraction's numerator, then its bar, then its denominator.
 */
import type { Glyph, GlyphTable } from "./handwrite-glyph-types.js";
import type { MathNode } from "./handwrite-parse.js";
import { emptyBBox, glyphBBox, growBBox, lookupGlyph, type BBox, type LaidStroke, type StrokeKind, type Vec } from "./handwrite-shapes.js";

export interface Layout {
	strokes: LaidStroke[];
	/** Ink extent plus the line box (cap height to descender), em. */
	bbox: BBox;
	/** y of the baseline, em (always 0). */
	baseline: number;
	/** Total advance, em. */
	width: number;
}

interface Box {
	width: number;
	/** Above the baseline (positive). */
	ascent: number;
	/** Below the baseline (positive). */
	descent: number;
	strokes: LaidStroke[];
}

interface Ctx {
	table: GlyphTable;
	glyph: number;
	pendingSpace: boolean;
}

const AXIS = 0.25;
const SCRIPT = 0.62;
const MISSING_ADV = 0.4;
const SPACED = new Set(["=", "+", "−", "-", "×", "±", "<", ">", "≤", "≥", "≠", "≈", "→", "⇒", "↦", "∈", "⊂", "·"]);

function emptyBox(width = 0, s = 1): Box {
	return { width, ascent: 0.46 * s, descent: 0, strokes: [] };
}

function shift(box: Box, dx: number, dy: number): LaidStroke[] {
	for (const st of box.strokes) {
		for (const p of st.points) {
			p[0] += dx;
			p[1] += dy;
		}
		st.anchor[0] += dx;
		st.anchor[1] += dy;
	}
	return box.strokes;
}

function newStroke(ctx: Ctx, points: Vec[], kind: StrokeKind, anchor: Vec, scale: number, first: boolean): LaidStroke {
	const st: LaidStroke = { points, kind, glyph: ctx.glyph, afterSpace: first && ctx.pendingSpace, anchor, scale };
	if (first) ctx.pendingSpace = false;
	return st;
}

/** Places a glyph with independent x/y scales and a vertical offset of its own coordinates. */
function placeGlyph(ctx: Ctx, glyph: Glyph, sx: number, sy: number, dy = 0, scale = sx): Box {
	ctx.glyph++;
	const strokes: LaidStroke[] = [];
	const bb = glyphBBox(glyph);
	const anchor: Vec = [(glyph.adv * sx) / 2, dy];
	glyph.strokes.forEach((s, i) => {
		const pts = s.map((p): Vec => [p[0] * sx, p[1] * sy + dy]);
		strokes.push(newStroke(ctx, pts, "ink", [anchor[0], anchor[1]], scale, i === 0));
	});
	if (glyph.strokes.length === 0) return emptyBox(glyph.adv * sx, scale);
	return {
		width: glyph.adv * sx,
		ascent: Math.max(0, -(bb.minY * sy + dy)),
		descent: Math.max(0, bb.maxY * sy + dy),
		strokes,
	};
}

function charBox(ctx: Ctx, ch: string, s: number): Box {
	const glyph = lookupGlyph(ctx.table, ch);
	if (glyph === null) return emptyBox(MISSING_ADV * s, s);
	const box = placeGlyph(ctx, glyph, s, s);
	if (!SPACED.has(ch) || s < 0.9) return box;
	const pad = 0.1 * s;
	shift(box, pad, 0);
	return { ...box, width: box.width + 2 * pad };
}

function row(items: Box[]): Box {
	let x = 0;
	let ascent = 0;
	let descent = 0;
	const strokes: LaidStroke[] = [];
	for (const b of items) {
		strokes.push(...shift(b, x, 0));
		x += b.width;
		ascent = Math.max(ascent, b.ascent);
		descent = Math.max(descent, b.descent);
	}
	return { width: x, ascent, descent, strokes };
}

function ruleBox(ctx: Ctx, x0: number, x1: number, y: number, s: number): LaidStroke {
	ctx.glyph++;
	const len = x1 - x0;
	const pts: Vec[] = [
		[x0, y + 0.01 * s],
		[x0 + len * 0.5, y],
		[x1, y - 0.012 * s],
	];
	return newStroke(ctx, pts, "rule", [(x0 + x1) / 2, y], s, true);
}

function bigOp(ctx: Ctx, ch: string, s: number): Box {
	const glyph = lookupGlyph(ctx.table, ch);
	if (glyph === null) return emptyBox(MISSING_ADV * s, s);
	const k = 1.4 * s;
	const bb = glyphBBox(glyph);
	// Centre the operator on the math axis.
	const dy = -AXIS * s - ((bb.minY + bb.maxY) / 2) * k;
	const box = placeGlyph(ctx, glyph, k, k, dy, s);
	shift(box, 0.04 * s, 0);
	return { ...box, width: box.width + 0.1 * s };
}

function stretchy(ctx: Ctx, ch: string, ascent: number, descent: number, s: number): Box {
	const glyph = lookupGlyph(ctx.table, ch);
	if (glyph === null) return emptyBox(0.2 * s, s);
	const bb = glyphBBox(glyph);
	const h = Math.max(bb.maxY - bb.minY, 0.1);
	const target = Math.max(ascent + descent + 0.14 * s, h * s);
	const sy = target / h;
	const sx = s * Math.min(1.35, Math.sqrt(sy / s));
	// Centre on the content's middle (or the axis when the content is a single line).
	const mid = Math.min(-AXIS * s, (descent - ascent) / 2);
	const dy = mid - ((bb.minY + bb.maxY) / 2) * sy;
	return placeGlyph(ctx, glyph, sx, sy, dy, s);
}

function layoutScripts(ctx: Ctx, node: Extract<MathNode, { type: "scripts" }>, s: number): Box {
	const base = node.base === null ? emptyBox(0, s) : layoutNode(ctx, node.base, s);
	const ss = s * SCRIPT;
	const sup = node.sup === null ? null : layoutNode(ctx, node.sup, ss);
	const sub = node.sub === null ? null : layoutNode(ctx, node.sub, ss);
	const limits =
		node.base !== null && (node.base.type === "bigop" || node.base.type === "word") && node.base.limits;
	if (limits) {
		const w = Math.max(base.width, sup?.width ?? 0, sub?.width ?? 0);
		const strokes = shift(base, (w - base.width) / 2, 0).slice();
		let ascent = base.ascent;
		let descent = base.descent;
		if (sup !== null) {
			const y = -base.ascent - 0.06 * s - sup.descent;
			strokes.push(...shift(sup, (w - sup.width) / 2, y));
			ascent = -y + sup.ascent;
		}
		if (sub !== null) {
			const y = base.descent + 0.06 * s + sub.ascent;
			strokes.push(...shift(sub, (w - sub.width) / 2, y));
			descent = y + sub.descent;
		}
		// A thin space after the operator, so a wide limit row never runs into what follows.
		return { width: w + 0.1 * s, ascent, descent, strokes };
	}
	const isInt = node.base?.type === "bigop";
	const strokes = base.strokes.slice();
	let ascent = base.ascent;
	let descent = base.descent;
	let w = base.width;
	const x = base.width - (isInt ? 0.04 * s : 0.02 * s);
	if (sup !== null) {
		const rise = isInt ? base.ascent - 0.25 * s : Math.max(0.45 * s, base.ascent - 0.3 * s);
		strokes.push(...shift(sup, x + (isInt ? 0.04 * s : 0), -rise));
		ascent = Math.max(ascent, rise + sup.ascent);
		w = Math.max(w, x + sup.width + (isInt ? 0.04 * s : 0));
	}
	if (sub !== null) {
		const drop = isInt ? base.descent : Math.max(sup !== null ? 0.25 * s : 0.2 * s, base.descent - 0.1 * s);
		strokes.push(...shift(sub, x - (isInt ? 0.1 * s : 0), drop));
		descent = Math.max(descent, drop + sub.descent);
		w = Math.max(w, x + sub.width - (isInt ? 0.1 * s : 0));
	}
	return { width: w + 0.03 * s, ascent, descent, strokes };
}

function layoutFrac(ctx: Ctx, node: Extract<MathNode, { type: "frac" }>, s: number): Box {
	const k = s * (s < 1 ? 0.85 : 0.92);
	const num = layoutNode(ctx, node.num, k);
	const over = 0.08 * s;
	const pad = 0.05 * s;
	const inner = Math.max(num.width, 0.3 * s);
	const gap = 0.1 * s;
	const axis = -AXIS * s;
	const numY = axis - gap - num.descent;
	// The bar is written after the numerator, before the denominator exists: size it on the
	// numerator first, then widen it below if the denominator turns out wider.
	const bar = ruleBox(ctx, 0, 1, axis, s);
	const den = layoutNode(ctx, node.den, k);
	const denY = axis + gap + den.ascent;
	const w = Math.max(inner, den.width) + 2 * over;
	const strokes = shift(num, pad + (w - num.width) / 2, numY).slice();
	// Stretch the provisional unit bar over the final width.
	for (const p of bar.points) p[0] = pad + p[0] * w;
	bar.anchor[0] = pad + w / 2;
	strokes.push(bar);
	strokes.push(...shift(den, pad + (w - den.width) / 2, denY));
	return { width: w + 2 * pad, ascent: -numY + num.ascent, descent: denY + den.descent, strokes };
}

function layoutSqrt(ctx: Ctx, node: Extract<MathNode, { type: "sqrt" }>, s: number): Box {
	const index = node.index === null ? null : layoutNode(ctx, node.index, s * 0.5);
	const glyph = lookupGlyph(ctx.table, "√") as Glyph;
	// The radical is written first; its size depends on the radicand, so measure the radicand on
	// a throwaway context, then lay everything out in writing order.
	const probe = layoutNode({ table: ctx.table, glyph: 0, pendingSpace: false }, node.body, s);
	const top = probe.ascent + 0.12 * s;
	const bottom = probe.descent + 0.02 * s;
	const bb = glyphBBox(glyph);
	const sy = (top + bottom) / Math.max(bb.maxY - bb.minY, 0.1);
	const sx = s * Math.min(1.2, Math.max(0.8, Math.sqrt(sy / s)));
	const rad = placeGlyph(ctx, glyph, sx, sy, -top - bb.minY * sy, s);
	const radRight = bb.maxX * sx;
	const strokes: LaidStroke[] = [];
	let dx = 0;
	if (index !== null) {
		dx = Math.max(0, index.width - radRight * 0.45);
		strokes.push(...shift(index, 0, -0.2 * top - index.descent));
	}
	strokes.push(...shift(rad, dx, 0));
	const body = layoutNode(ctx, node.body, s);
	const bx = dx + radRight + 0.04 * s;
	strokes.push(...shift(body, bx, 0));
	const end = bx + body.width + 0.05 * s;
	strokes.push(ruleBox(ctx, dx + radRight - 0.01 * s, end, -top, s));
	return { width: end + 0.04 * s, ascent: top + 0.02 * s, descent: bottom, strokes };
}

function layoutNode(ctx: Ctx, node: MathNode, s: number): Box {
	switch (node.type) {
		case "char":
			return charBox(ctx, node.ch, s);
		case "space":
			ctx.pendingSpace = ctx.pendingSpace || node.text || node.width >= 0.5;
			return { width: node.width * s, ascent: 0, descent: 0, strokes: [] };
		case "group":
			return row(node.items.map((n) => layoutNode(ctx, n, s)));
		case "word": {
			const letters = row(Array.from(node.text, (ch) => charBox(ctx, ch, s)));
			return { ...letters, width: letters.width + 0.08 * s };
		}
		case "bigop":
			return bigOp(ctx, node.ch, s);
		case "scripts":
			return layoutScripts(ctx, node, s);
		case "frac":
			return layoutFrac(ctx, node, s);
		case "sqrt":
			return layoutSqrt(ctx, node, s);
		case "fenced": {
			// Measure the content first so the opening delimiter is sized before it is written.
			const probe = layoutNode({ table: ctx.table, glyph: 0, pendingSpace: false }, node.body, s);
			const a = Math.max(probe.ascent, 0.6 * s);
			const d = Math.max(probe.descent, 0.15 * s);
			const parts: Box[] = [];
			if (node.open !== "") parts.push(stretchy(ctx, node.open, a, d, s));
			parts.push(layoutNode(ctx, node.body, s));
			if (node.close !== "") parts.push(stretchy(ctx, node.close, a, d, s));
			return row(parts);
		}
	}
}

/** Lays out a parsed formula with the given glyph table. */
export function layoutFormula(ast: MathNode, table: GlyphTable): Layout {
	const ctx: Ctx = { table, glyph: 0, pendingSpace: false };
	const box = layoutNode(ctx, ast, 1);
	const bbox = emptyBBox();
	growBBox(bbox, [
		[0, -Math.max(box.ascent, 0.7)],
		[box.width, Math.max(box.descent, 0.24)],
	]);
	for (const st of box.strokes) growBBox(bbox, st.points);
	return { strokes: box.strokes, bbox, baseline: 0, width: box.width };
}
