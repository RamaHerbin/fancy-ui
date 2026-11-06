/**
 * The hand (shared core: byte-identical in the Svelte, React and Vue packages): per-glyph
 * variation from the seed, Catmull-Rom smoothing to short segments at render scale, a slow wobble
 * along each stroke and a ballpoint pressure profile. Units stay em; widths are multipliers of
 * the base stroke width.
 */
import { hashSeed, jitter, mulberry32, range } from "./handwrite-prng.js";
import type { LaidStroke, StrokeKind, Vec } from "./handwrite-shapes.js";

export interface InkStroke {
	points: Vec[];
	/** Width multiplier per point. */
	widths: number[];
	/** Cumulative arc length per point, em (first 0, last = length). */
	arc: number[];
	length: number;
	kind: StrokeKind;
	glyph: number;
	afterSpace: boolean;
}

export interface HandOptions {
	seed: number;
	/** Render scale, px per em: the smoothing aims at ≈ 2 px segments. */
	pxPerEm: number;
	/** Turns the per-glyph variation and the wobble off (the bubble brings its own roughness). */
	steady?: boolean;
}

const DEG = Math.PI / 180;

function transformGlyph(st: LaidStroke, opts: HandOptions): Vec[] {
	if (opts.steady || st.kind === "bubble") return st.points.map((p): Vec => [p[0], p[1]]);
	const rng = mulberry32(hashSeed(opts.seed, st.glyph));
	const rot = jitter(rng, st.kind === "rule" ? 0.8 : 2) * DEG;
	const k = st.kind === "rule" ? 1 : 1 + jitter(rng, 0.04);
	const dy = jitter(rng, 0.02) * st.scale;
	const [ax, ay] = st.anchor;
	const c = Math.cos(rot);
	const s = Math.sin(rot);
	return st.points.map((p): Vec => {
		const x = (p[0] - ax) * k;
		const y = (p[1] - ay) * k;
		return [ax + x * c - y * s, ay + x * s + y * c + dy];
	});
}

/** Uniform Catmull-Rom through the control points, about one sample every `step` em. */
export function catmullRom(points: readonly Vec[], step: number): Vec[] {
	if (points.length < 2) return points.map((p): Vec => [p[0], p[1]]);
	const out: Vec[] = [[points[0]![0], points[0]![1]]];
	for (let i = 0; i < points.length - 1; i++) {
		const p0 = points[Math.max(0, i - 1)]!;
		const p1 = points[i]!;
		const p2 = points[i + 1]!;
		const p3 = points[Math.min(points.length - 1, i + 2)]!;
		const span = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
		const n = Math.min(64, Math.max(1, Math.ceil(span / step)));
		for (let j = 1; j <= n; j++) {
			const t = j / n;
			const t2 = t * t;
			const t3 = t2 * t;
			const f = (a: number, b: number, c: number, d: number) =>
				0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
			out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
		}
	}
	return out;
}

function arcLengths(points: readonly Vec[]): number[] {
	const arc = [0];
	for (let i = 1; i < points.length; i++) {
		arc.push(arc[i - 1]! + Math.hypot(points[i]![0] - points[i - 1]![0], points[i]![1] - points[i - 1]![1]));
	}
	return arc;
}

function smoothstep(x: number): number {
	const t = Math.min(1, Math.max(0, x));
	return t * t * (3 - 2 * t);
}

/** Offsets each point along the normal by a slow sine of its arc length. */
function wobble(points: Vec[], arc: number[], amp: number, wavelength: number, phase: number): void {
	if (amp === 0 || points.length < 3) return;
	const src = points.map((p): Vec => [p[0], p[1]]);
	for (let i = 0; i < points.length; i++) {
		const a = src[Math.max(0, i - 1)]!;
		const b = src[Math.min(src.length - 1, i + 1)]!;
		const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
		const nx = -(b[1] - a[1]) / len;
		const ny = (b[0] - a[0]) / len;
		const o = amp * Math.sin((arc[i]! / wavelength) * Math.PI * 2 + phase);
		points[i]![0] += nx * o;
		points[i]![1] += ny * o;
	}
}

/** Width multipliers: thin where the pen lands and lifts, a little heavier on downstrokes. */
function pressure(points: readonly Vec[], arc: readonly number[], weight: number): number[] {
	const total = arc[arc.length - 1] ?? 0;
	const ramp = Math.max(0.02, Math.min(0.09, total * 0.3));
	return points.map((p, i) => {
		const a = points[Math.max(0, i - 1)]!;
		const b = points[Math.min(points.length - 1, i + 1)]!;
		const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
		const down = (b[1] - a[1]) / len; // +1 going straight down
		const taper = 0.35 + 0.65 * smoothstep(arc[i]! / ramp) * smoothstep((total - arc[i]!) / (ramp * 1.4));
		return Math.max(0.25, Math.min(1.35, weight * taper * (1 + 0.18 * down)));
	});
}

/** Turns laid-out strokes into inked strokes: varied, smoothed, wobbled and pressured. */
export function inkStrokes(strokes: readonly LaidStroke[], opts: HandOptions): InkStroke[] {
	const step = 2 / Math.max(1, opts.pxPerEm);
	return strokes.map((st, index) => {
		const rng = mulberry32(hashSeed(opts.seed ^ 0x5bd1e995, index));
		const pts = catmullRom(transformGlyph(st, opts), step);
		const still = opts.steady || st.kind === "bubble";
		wobble(pts, arcLengths(pts), still ? 0 : 0.01 * st.scale, range(rng, 0.35, 0.6) * st.scale, rng() * Math.PI * 2);
		const arc = arcLengths(pts);
		const weight = range(rng, 0.92, 1.05);
		return {
			points: pts,
			widths: st.kind === "bubble" ? pts.map(() => weight) : pressure(pts, arc, weight),
			arc,
			length: arc[arc.length - 1] ?? 0,
			kind: st.kind,
			glyph: st.glyph,
			afterSpace: st.afterSpace,
		};
	});
}
