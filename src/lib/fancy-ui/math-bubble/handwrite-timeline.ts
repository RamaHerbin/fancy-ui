/**
 * Writing timeline (shared core: byte-identical in the Svelte, React and Vue packages): the
 * bubble is drawn first, then the formula is written stroke by stroke at a steady pen speed with
 * short pen lifts between strokes, longer ones between glyphs and at spaces. Times in ms.
 */
import type { InkStroke } from "./handwrite-hand.js";
import type { Vec } from "./handwrite-shapes.js";

export interface TimelineOptions {
	/** Writing speed, em per second. */
	speed?: number;
	/** Total time of the bubble's passes, ms. */
	bubbleDuration?: number;
	/** Pause after the bubble before writing starts, ms. */
	bubbleGap?: number;
	/** Rest on the finished frame before the next formula, ms (the component cycles). */
	hold?: number;
}

export interface TimedStroke {
	stroke: InkStroke;
	start: number;
	duration: number;
}

export interface Timeline {
	strokes: TimedStroke[];
	/** End of the bubble, ms (0 without one). */
	bubbleEnd: number;
	/** When the first formula stroke starts, ms. */
	writeStart: number;
	/** End of the last stroke, ms. */
	duration: number;
	hold: number;
}

export interface StrokeFrame {
	stroke: InkStroke;
	/** Drawn share of the stroke's arc length, 0..1. */
	fraction: number;
}

export interface Frame {
	strokes: StrokeFrame[];
	/** Pen tip: the end of the ink being laid down, or null while the pen is lifted. */
	pen: Vec | null;
	/** True once every stroke is complete. */
	done: boolean;
}

export const DEFAULT_SPEED = 5;
const MIN_STROKE = 60;
const LIFT = 80;
const BETWEEN_GLYPHS = 100;
const AT_SPACE = 150;

export function easeOut(t: number): number {
	const u = Math.min(1, Math.max(0, t));
	return 1 - (1 - u) * (1 - u);
}

/** Assigns a start and a duration to every stroke; bubble strokes must come first. */
export function buildTimeline(strokes: readonly InkStroke[], opts: TimelineOptions = {}): Timeline {
	const speed = opts.speed !== undefined && opts.speed > 0 ? opts.speed : DEFAULT_SPEED;
	const bubbleTotal = Math.max(0, opts.bubbleDuration ?? 450);
	const out: TimedStroke[] = [];
	const bubble = strokes.filter((s) => s.kind === "bubble");
	const ink = strokes.filter((s) => s.kind !== "bubble");
	const bubbleLength = bubble.reduce((sum, s) => sum + s.length, 0);
	let t = 0;
	for (const stroke of bubble) {
		const share = bubbleLength > 0 ? stroke.length / bubbleLength : 1 / bubble.length;
		const duration = bubbleTotal * share;
		out.push({ stroke, start: t, duration });
		t += duration;
	}
	const bubbleEnd = t;
	const writeStart = bubble.length > 0 ? bubbleEnd + Math.max(0, opts.bubbleGap ?? 100) : 0;
	t = writeStart;
	ink.forEach((stroke, i) => {
		if (i > 0) {
			const prev = ink[i - 1]!;
			t += stroke.afterSpace ? AT_SPACE : prev.glyph === stroke.glyph ? LIFT : BETWEEN_GLYPHS;
		}
		const duration = Math.max(MIN_STROKE, (stroke.length / speed) * 1000);
		out.push({ stroke, start: t, duration });
		t += duration;
	});
	const last = out[out.length - 1];
	return {
		strokes: out,
		bubbleEnd,
		writeStart,
		duration: last ? last.start + last.duration : 0,
		hold: Math.max(0, opts.hold ?? 0),
	};
}

/** The point at a share of a stroke's arc length (and the index of the segment it lies on). */
export function pointAt(stroke: InkStroke, fraction: number): { point: Vec; index: number } {
	const pts = stroke.points;
	if (pts.length === 0) return { point: [0, 0], index: 0 };
	const target = Math.min(1, Math.max(0, fraction)) * stroke.length;
	let i = 1;
	while (i < pts.length - 1 && stroke.arc[i]! < target) i++;
	if (pts.length === 1) return { point: [pts[0]![0], pts[0]![1]], index: 0 };
	const a0 = stroke.arc[i - 1]!;
	const seg = stroke.arc[i]! - a0;
	const u = seg > 0 ? Math.min(1, Math.max(0, (target - a0) / seg)) : 1;
	const p = pts[i - 1]!;
	const q = pts[i]!;
	return { point: [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u], index: i - 1 };
}

/** What is drawn at time `t` (ms from the start). */
export function frameAt(timeline: Timeline, t: number): Frame {
	let pen: Vec | null = null;
	const strokes = timeline.strokes.map(({ stroke, start, duration }) => {
		const u = duration > 0 ? (t - start) / duration : t >= start ? 1 : 0;
		const fraction = u <= 0 ? 0 : u >= 1 ? 1 : easeOut(u);
		if (u > 0 && u < 1) pen = pointAt(stroke, fraction).point;
		return { stroke, fraction };
	});
	return { strokes, pen, done: t >= timeline.duration };
}

/** One loop of a cycling bubble: writing plus the hold on the finished frame. */
export function cycleDuration(timeline: Timeline): number {
	return timeline.duration + timeline.hold;
}
