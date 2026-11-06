/**
 * Bubble outlines as pen strokes (shared core: byte-identical in the Svelte, React and Vue
 * packages), so they render with the same pen as the formula: a felt-tip doodle in two quick
 * passes, each a little off the other, overshooting where it closes. Units: em, y down.
 */
import { jitter, mulberry32, range, type Rng } from "./handwrite-prng.js";
import { emptyBBox, growBBox, type BBox, type LaidStroke, type Vec } from "./handwrite-shapes.js";

export type BubbleKind = "speech" | "thought" | "shout" | "none";
export type TailSide = "left" | "right" | "bottom" | "top";

export interface BubbleOptions {
	kind: BubbleKind;
	tail: TailSide;
	/** Where the tail leaves its side, 0..1 (left → right, top → bottom). */
	tailOffset: number;
	/** Space between the formula's box and the outline, em. */
	padding: number;
	seed: number;
}

export interface Bubble {
	strokes: LaidStroke[];
	/** Outline extent, tail included, em. */
	bbox: BBox;
}

const TAIL = 0.55;

function clamp01(v: number): number {
	return Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0.5));
}

/** Outward normal of a tail side. */
function sideNormal(side: TailSide): Vec {
	return side === "left" ? [-1, 0] : side === "right" ? [1, 0] : side === "top" ? [0, -1] : [0, 1];
}

function arc(out: Vec[], cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number): void {
	for (let i = 0; i <= n; i++) {
		const a = a0 + ((a1 - a0) * i) / n;
		out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
	}
}

function quad(out: Vec[], a: Vec, c: Vec, b: Vec, n: number): void {
	for (let i = 1; i <= n; i++) {
		const t = i / n;
		const u = 1 - t;
		out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
	}
}

/** Rounded rectangle, clockwise from the top-left, with the tail spliced into its side. */
function speechOutline(x0: number, y0: number, x1: number, y1: number, o: BubbleOptions): Vec[] {
	const w = x1 - x0;
	const h = y1 - y0;
	const r = Math.min(0.45, h * 0.35, w * 0.35);
	const f = clamp01(o.tailOffset);
	const out: Vec[] = [];
	const edge = (side: TailSide, a: Vec, b: Vec) => {
		if (side === o.tail) {
			const along = side === "bottom" || side === "left" ? 1 - f : f;
			const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
			const tx = (b[0] - a[0]) / len;
			const ty = (b[1] - a[1]) / len;
			const bw = Math.min(0.4, len * 0.3);
			const c = Math.min(len - bw / 2, Math.max(bw / 2, len * along));
			const [nx, ny] = sideNormal(side);
			const b1: Vec = [a[0] + tx * (c - bw / 2), a[1] + ty * (c - bw / 2)];
			const b2: Vec = [a[0] + tx * (c + bw / 2), a[1] + ty * (c + bw / 2)];
			// The tip leans back toward the bubble's middle, like a drawn comic tail.
			const lean = along < 0.5 ? 0.18 : -0.18;
			const tip: Vec = [b1[0] + tx * (bw / 2 - lean) + nx * TAIL, b1[1] + ty * (bw / 2 - lean) + ny * TAIL];
			out.push(b1);
			quad(out, b1, [b1[0] + nx * TAIL * 0.5, b1[1] + ny * TAIL * 0.5], tip, 3);
			quad(out, tip, [b2[0] + nx * TAIL * 0.35 - tx * 0.05, b2[1] + ny * TAIL * 0.35 - ty * 0.05], b2, 3);
		}
		out.push(b);
	};
	out.push([x0 + r, y0]);
	edge("top", [x0 + r, y0], [x1 - r, y0]);
	arc(out, x1 - r, y0 + r, r, r, -Math.PI / 2, 0, 4);
	edge("right", [x1, y0 + r], [x1, y1 - r]);
	arc(out, x1 - r, y1 - r, r, r, 0, Math.PI / 2, 4);
	edge("bottom", [x1 - r, y1], [x0 + r, y1]);
	arc(out, x0 + r, y1 - r, r, r, Math.PI / 2, Math.PI, 4);
	edge("left", [x0, y1 - r], [x0, y0 + r]);
	arc(out, x0 + r, y0 + r, r, r, Math.PI, Math.PI * 1.5, 4);
	return out;
}

/** Angle on the ellipse that points at the tail. */
function tailAngle(o: BubbleOptions): number {
	const f = (clamp01(o.tailOffset) - 0.5) * 1.2;
	if (o.tail === "right") return f;
	if (o.tail === "left") return Math.PI - f;
	if (o.tail === "bottom") return Math.PI / 2 - f;
	return -Math.PI / 2 + f;
}

function cloudOutline(cx: number, cy: number, rx: number, ry: number, rng: Rng): Vec[] {
	const perimeter = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
	// Few, round puffs read as a cloud; many shallow ones read as a wavy line.
	const n = Math.max(7, Math.round(perimeter / 0.8));
	const out: Vec[] = [];
	const a0 = -Math.PI / 2;
	for (let i = 0; i < n; i++) {
		const a = a0 + (i / n) * Math.PI * 2;
		const b = a0 + ((i + 1) / n) * Math.PI * 2;
		const p: Vec = [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
		const q: Vec = [cx + Math.cos(b) * rx, cy + Math.sin(b) * ry];
		const m = (a + b) / 2;
		const bulge = range(rng, 0.26, 0.34);
		const c: Vec = [cx + Math.cos(m) * (rx + bulge * 2), cy + Math.sin(m) * (ry + bulge * 2)];
		if (i === 0) out.push(p);
		quad(out, p, c, q, 7);
	}
	return out;
}

function spikyOutline(cx: number, cy: number, rx: number, ry: number, rng: Rng, tailA: number): Vec[] {
	const n = Math.max(10, Math.round((Math.PI * (rx + ry)) / 0.42));
	const out: Vec[] = [];
	const ti = Math.round((((tailA + Math.PI / 2) / (Math.PI * 2)) % 1 + 1) % 1 * n) % n;
	for (let i = 0; i <= n; i++) {
		const k = i % n;
		const a = -Math.PI / 2 + (k / n) * Math.PI * 2;
		const inner: Vec = [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
		out.push(inner);
		if (i === n) break;
		const m = a + Math.PI / n;
		const spike = k === ti ? TAIL + 0.3 : range(rng, 0.18, 0.38);
		out.push([cx + Math.cos(m) * (rx + spike), cy + Math.sin(m) * (ry + spike)]);
	}
	return out;
}

/** Two rough passes over a closed outline: low-frequency drift plus an overshoot at the join. */
function roughPasses(outline: Vec[], size: number, rng: Rng, passes = 2): Vec[][] {
	const amp = size * range(rng, 0.01, 0.015);
	const result: Vec[][] = [];
	const n = outline.length;
	for (let pass = 0; pass < passes; pass++) {
		const ph = [rng() * 6.28, rng() * 6.28, rng() * 6.28, rng() * 6.28];
		const start = pass === 0 ? 0 : Math.round(n * range(rng, 0.02, 0.08));
		const extra = pass === 0 ? 2 : 1;
		const pts: Vec[] = [];
		for (let j = 0; j <= n + extra - 1; j++) {
			const p = outline[(start + j) % n]!;
			const u = j / n;
			const dx = amp * (Math.sin(u * 12.57 + ph[0]!) * 0.7 + Math.sin(u * 31.4 + ph[1]!) * 0.3) + jitter(rng, amp * 0.2);
			const dy = amp * (Math.sin(u * 12.57 + ph[2]!) * 0.7 + Math.sin(u * 31.4 + ph[3]!) * 0.3) + jitter(rng, amp * 0.2);
			pts.push([p[0] + dx, p[1] + dy]);
		}
		result.push(pts);
	}
	return result;
}

function toStrokes(paths: Vec[][], startGlyph: number): LaidStroke[] {
	return paths.map((points, i) => ({
		points,
		kind: "bubble",
		glyph: startGlyph - i,
		afterSpace: false,
		anchor: [0, 0],
		scale: 1,
	}));
}

/** Builds the bubble around a formula box (em). Glyph ids are negative so they never clash. */
export function buildBubble(box: BBox, o: BubbleOptions): Bubble {
	const bbox = emptyBBox();
	if (o.kind === "none") return { strokes: [], bbox: growBBox(bbox, [[box.minX, box.minY], [box.maxX, box.maxY]]) };
	const rng = mulberry32(o.seed ^ 0x2545f491);
	const x0 = box.minX - o.padding;
	const y0 = box.minY - o.padding;
	const x1 = box.maxX + o.padding;
	const y1 = box.maxY + o.padding;
	const size = Math.max(x1 - x0, y1 - y0);
	const cx = (x0 + x1) / 2;
	const cy = (y0 + y1) / 2;
	let paths: Vec[][];
	if (o.kind === "speech") {
		paths = roughPasses(speechOutline(x0, y0, x1, y1, o), size, rng);
	} else {
		const rx = ((x1 - x0) / 2) * 1.3;
		const ry = ((y1 - y0) / 2) * 1.3;
		const ta = tailAngle(o);
		if (o.kind === "shout") {
			paths = roughPasses(spikyOutline(cx, cy, rx, ry, rng, ta), size, rng);
		} else {
			paths = roughPasses(cloudOutline(cx, cy, rx, ry, rng), size, rng);
			// Two small puffs trailing toward the tail side.
			const ex = cx + Math.cos(ta) * (rx + 0.35);
			const ey = cy + Math.sin(ta) * (ry + 0.35);
			for (const [d, r] of [[0.05, 0.11], [0.38, 0.065]] as const) {
				const c: Vec = [ex + Math.cos(ta) * d, ey + Math.sin(ta) * d];
				const ring: Vec[] = [];
				arc(ring, c[0], c[1], r, r, -Math.PI / 2, Math.PI * 1.62, 9);
				paths.push(roughPasses(ring, r * 4, rng, 1)[0]!);
			}
		}
	}
	for (const p of paths) growBBox(bbox, p);
	return { strokes: toStrokes(paths, -1), bbox };
}
