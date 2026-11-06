/**
 * Drawing (shared core: byte-identical in the Svelte, React and Vue packages): a frame onto a
 * 2D canvas context with variable-width round-capped segments, and the finished drawing as SVG
 * path data for server rendering and no-JS. Nothing here touches a browser global.
 */
import type { InkStroke } from "./handwrite-hand.js";
import { pointAt, type Frame } from "./handwrite-timeline.js";

/** The part of a 2D canvas context the pen uses. */
export interface PenContext {
	beginPath(): void;
	moveTo(x: number, y: number): void;
	lineTo(x: number, y: number): void;
	stroke(): void;
	lineWidth: number;
	strokeStyle: unknown;
	lineCap: CanvasLineCap | string;
	lineJoin: CanvasLineJoin | string;
}

export interface DrawStyle {
	/** Ink colour (any canvas/SVG colour). */
	color: string;
	/** Base pen width, px. */
	strokeWidth: number;
	/** px per em. */
	scale: number;
	/** Where the em origin lands, px. */
	offsetX: number;
	offsetY: number;
}

/** Widths are batched into steps of this many px so a stroke needs few canvas calls. */
const WIDTH_STEP = 0.2;

function drawPartial(ctx: PenContext, stroke: InkStroke, fraction: number, style: DrawStyle): void {
	const pts = stroke.points;
	if (pts.length === 0 || fraction <= 0) return;
	const { point: tip, index } = fraction >= 1 ? { point: pts[pts.length - 1]!, index: pts.length - 2 } : pointAt(stroke, fraction);
	const X = (x: number) => style.offsetX + x * style.scale;
	const Y = (y: number) => style.offsetY + y * style.scale;
	const last = Math.max(0, index);
	if (pts.length === 1) {
		ctx.lineWidth = style.strokeWidth * stroke.widths[0]!;
		ctx.beginPath();
		ctx.moveTo(X(pts[0]![0]), Y(pts[0]![1]));
		ctx.lineTo(X(pts[0]![0]) + 0.01, Y(pts[0]![1]));
		ctx.stroke();
		return;
	}
	let width = -1;
	let open = false;
	for (let i = 0; i <= last; i++) {
		const a = pts[i]!;
		const b = i === last ? tip : pts[i + 1]!;
		const w = Math.max(WIDTH_STEP, Math.round((style.strokeWidth * (stroke.widths[i]! + stroke.widths[i + 1]!)) / 2 / WIDTH_STEP) * WIDTH_STEP);
		if (w !== width) {
			if (open) ctx.stroke();
			ctx.lineWidth = w;
			ctx.beginPath();
			ctx.moveTo(X(a[0]), Y(a[1]));
			width = w;
			open = true;
		}
		ctx.lineTo(X(b[0]), Y(b[1]));
	}
	if (open) ctx.stroke();
}

/** Draws one frame. The caller clears the canvas and sets any device-pixel transform. */
export function drawFrame(ctx: PenContext, frame: Frame, style: DrawStyle): void {
	ctx.strokeStyle = style.color;
	ctx.lineCap = "round";
	ctx.lineJoin = "round";
	for (const { stroke, fraction } of frame.strokes) drawPartial(ctx, stroke, fraction, style);
}

export interface SvgStroke {
	d: string;
	/** Uniform width approximation, px. */
	width: number;
	kind: InkStroke["kind"];
}

function n(v: number): string {
	const r = Math.round(v * 100) / 100;
	return Object.is(r, -0) ? "0" : String(r);
}

/** SVG path data of the finished drawing (px, same placement as `drawFrame`). */
export function toSvgPaths(strokes: readonly InkStroke[], style: DrawStyle): SvgStroke[] {
	return strokes
		.filter((s) => s.points.length > 0)
		.map((s) => {
			const d = s.points
				.map((p, i) => `${i === 0 ? "M" : "L"}${n(style.offsetX + p[0] * style.scale)} ${n(style.offsetY + p[1] * style.scale)}`)
				.join("");
			const mean = s.widths.reduce((sum, w) => sum + w, 0) / Math.max(1, s.widths.length);
			return { d, width: Math.round(style.strokeWidth * mean * 100) / 100, kind: s.kind };
		});
}
