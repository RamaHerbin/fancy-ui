// sun-switch-core.ts — framework-free maths and Canvas 2D painter for SunSwitch.
// No framework imports, no module-scope window/document access, no build-time env.
// Byte-identical copies live in the React and Vue packages: edit here, copy there.
//
// Grid model: every dot sits at the top-left of its `cell`, is `dot` CSS px square,
// and is drawn in device pixels with rounding (no `setTransform(dpr)`), so 4 px dots
// stay crisp at fractional device pixel ratios.

/** Four colours from the top of the sun to the bottom (halo: outer fringe → inner rim). */
export type SunPalette = readonly [string, string, string, string];

export const SUN_PALETTE: SunPalette = Object.freeze([
	"#f7cf4a",
	"#f6a24e",
	"#ef7a5e",
	"#ea7d9c",
]) as SunPalette;

/** Opacity of the horizon dots when drawn in ink (outside the lens). */
export const HORIZON_ALPHA = 0.16;
/** Share of ink laid over the day sun at rest, so the lens (pure colour) reads on
 * the disc too. Mixing toward the ink also raises the disc's contrast with the page. */
export const DAY_REST_INK = 0.3;
/** Half-widths of the reflection rows under the horizon line, as a share of the
 * disc's outer radius (radius + 0.5). */
export const REFLECTION_ROWS: readonly number[] = Object.freeze([0.85, 0.6, 0.35]);
/** Exponent applied to the halo depth before the Bayer threshold. */
export const HALO_EXPONENT = 0.7;

const BAYER4_RAW = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** 4 × 4 ordered-dither thresholds, `(v + 0.5) / 16`, row-major (index = y * 4 + x). */
export const BAYER4: readonly number[] = Object.freeze(BAYER4_RAW.map((v) => (v + 0.5) / 16));

/** Threshold of grid cell (x, y). Fixed in grid space; negative indices wrap. */
export function bayer4(x: number, y: number): number {
	return BAYER4[(y & 3) * 4 + (x & 3)] ?? 0;
}

export function easeInOutCubic(t: number): number {
	if (!(t > 0)) return 0;
	if (t >= 1) return 1;
	return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** `clamp01(D) ** 0.7`: fraction of Bayer cells lit at halo depth D. */
export function haloDensity(D: number): number {
	if (!(D > 0)) return 0;
	if (D >= 1) return 1;
	return D ** HALO_EXPONENT;
}

/** Palette index at halo depth D: 0 = outer fringe (first colour), 3 = inner rim. */
export function haloColorIndex(D: number): 0 | 1 | 2 | 3 {
	const i = Math.floor(D * 4);
	return (i <= 0 ? 0 : i >= 3 ? 3 : i) as 0 | 1 | 2 | 3;
}

export interface ParsedColor {
	r: number;
	g: number;
	b: number;
	a: number;
}

/** Parses `rgb()` / `rgba()` (comma or space syntax), `#rgb[a]` / `#rrggbb[aa]` and
 * `transparent`. Returns null for anything else (named colours, `oklch()`, ...). */
export function parseInk(css: string): ParsedColor | null {
	const s = css.trim().toLowerCase();
	if (s === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
	if (s.startsWith("#")) {
		const hex = s.slice(1);
		if (!/^[0-9a-f]+$/.test(hex)) return null;
		if (hex.length === 3 || hex.length === 4) {
			const n = [...hex].map((c) => parseInt(c + c, 16));
			return { r: n[0] ?? 0, g: n[1] ?? 0, b: n[2] ?? 0, a: n[3] === undefined ? 1 : n[3] / 255 };
		}
		if (hex.length === 6 || hex.length === 8) {
			const n = [0, 2, 4, 6].map((i) => parseInt(hex.slice(i, i + 2), 16));
			const a = hex.length === 8 ? (n[3] ?? 255) / 255 : 1;
			return { r: n[0] ?? 0, g: n[1] ?? 0, b: n[2] ?? 0, a };
		}
		return null;
	}
	const m = /^rgba?\(([^)]*)\)$/.exec(s);
	if (!m) return null;
	const parts = (m[1] ?? "").split(/[\s,/]+/).filter(Boolean);
	if (parts.length < 3) return null;
	const num = (p: string | undefined, scale: number): number => {
		if (p === undefined) return NaN;
		return p.endsWith("%") ? (parseFloat(p) / 100) * scale : parseFloat(p);
	};
	const r = num(parts[0], 255);
	const g = num(parts[1], 255);
	const b = num(parts[2], 255);
	const a = parts[3] === undefined ? 1 : num(parts[3], 1);
	if ([r, g, b, a].some((v) => !Number.isFinite(v))) return null;
	return { r, g, b, a: Math.min(1, Math.max(0, a)) };
}

// --- HDR glow ---------------------------------------------------------------

/** Glow of the day sun at rest (× SDR white), on HDR displays. */
export const SUN_GLOW_DAY = 2.2;
/** Glow of a sun cell under the lens. */
export const SUN_GLOW_LENS = 4.9;
/** Glow of a horizon / reflection cell under the lens. */
export const HORIZON_GLOW_LENS = 1.6;

/** Halo glow at depth D: the dense inner rim peaks, the sparse fringe stays near SDR. */
export function haloGlow(D: number): number {
	return 1.5 + 3.4 * Math.min(1, Math.max(0, D));
}

/**
 * Receives every painted square that should glow on an HDR display: its
 * top-left corner in device px, its colour as `0xRRGGBB` (what the 2D canvas
 * shows) and its glow (× SDR white). The 2D painting is unchanged.
 */
export interface GlowSink {
	clear(): void;
	push(px: number, py: number, rgb: number, glow: number): void;
}

/** What the painter hands its frames to: a sink and a render call. */
export interface SunGlowTarget {
	readonly sink: GlowSink;
	render(width: number, height: number, size: number): void;
}

const RGB_CACHE = new Map<string, number>();

/** `0xRRGGBB` of an opaque-enough CSS colour `parseInk` reads, else -1. Cached. */
export function rgbOf(css: string): number {
	const hit = RGB_CACHE.get(css);
	if (hit !== undefined) return hit;
	const c = parseInk(css);
	const v =
		c && c.a > 0
			? (Math.round(Math.min(255, Math.max(0, c.r))) << 16) |
				(Math.round(Math.min(255, Math.max(0, c.g))) << 8) |
				Math.round(Math.min(255, Math.max(0, c.b)))
			: -1;
	if (RGB_CACHE.size > 64) RGB_CACHE.clear();
	RGB_CACHE.set(css, v);
	return v;
}

/** `a` blended toward `b` by `t` (sRGB, like the 2D canvas does). */
export function mixRgb(a: number, b: number, t: number): number {
	const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t) & 255;
	return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

export interface SunCell {
	x: number;
	y: number;
	/** Palette index. */
	color: number;
	layer: "sun" | "horizon";
}

export interface SunRaster {
	/** Canvas side in cells: 2 × radius + 1. */
	size: number;
	/** First row below the visible disc (== size when `horizon` is false). */
	horizonRow: number;
	cells: SunCell[];
}

/** Deterministic integer hash in [0, 1). Same bits in every JS engine. */
export function hash2(x: number, y: number): number {
	let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1);
	h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
	h ^= h >>> 13;
	return (h >>> 0) / 4294967296;
}

/** Rasterises the sun disc (cut at 60 % when `horizon`), the dotted horizon line
 * and up to three dashed reflection rows under it. */
export function rasterSun(o: { radius: number; horizon: boolean }): SunRaster {
	const R = Math.max(1, Math.round(o.radius));
	const size = 2 * R + 1;
	const hY = o.horizon ? Math.round(0.6 * size) : size;
	const rr = R + 0.5;
	const cells: SunCell[] = [];
	for (let y = 0; y < hY; y++) {
		const dy = y - R;
		const half = Math.floor(Math.sqrt(Math.max(0, rr * rr - dy * dy)));
		const color = Math.min(3, Math.floor((y * 4) / hY));
		for (let x = R - half; x <= R + half; x++) cells.push({ x, y, color, layer: "sun" });
	}
	if (o.horizon && hY < size) {
		for (let x = 0; x < size; x += 2) cells.push({ x, y: hY, color: 1, layer: "horizon" });
		for (let k = 0; k < REFLECTION_ROWS.length; k++) {
			const y = hY + 1 + k;
			if (y >= size) break;
			const w = Math.round(rr * (REFLECTION_ROWS[k] ?? 0));
			for (let x = R - w; x <= R + w; x++) {
				if ((x + y) % 4 === 3) continue;
				const color = Math.min(3, 1 + Math.floor(hash2(y, x) * 3));
				cells.push({ x, y, color, layer: "horizon" });
			}
		}
	}
	return { size, horizonRow: hY, cells };
}

/** `((origin % cell) + cell) % cell`: grid phase of a pixel coordinate. */
export function gridOffset(origin: number, cell: number): number {
	return ((origin % cell) + cell) % cell;
}

/** Outer halo radius (cells) at which the clip covers every point of a W × H box. */
export function coverRadiusCells(
	origin: { x: number; y: number },
	W: number,
	H: number,
	cell: number,
	halo: number
): number {
	return (
		Math.hypot(Math.max(origin.x, W - origin.x), Math.max(origin.y, H - origin.y)) / cell + halo
	);
}

/** One row of the staircase clip, in px. Every coordinate is ≡ the grid offset (mod cell). */
export interface StairRow {
	y0: number;
	y1: number;
	x0: number;
	x1: number;
}

/**
 * Rows of the grid-aligned staircase disc of radius `innerRadius` (cells) centred
 * on (tx, ty) (grid units, usually integer + 0.5). A cell row is included when its
 * centre line meets the disc; its span is the chord widened to whole cells.
 * Empty when `innerRadius` is not > 0.
 */
export function staircaseRows(
	tx: number,
	ty: number,
	innerRadius: number,
	cell: number,
	ox: number,
	oy: number
): StairRow[] {
	const rows: StairRow[] = [];
	if (!(innerRadius > 0)) return rows;
	const last = Math.ceil(ty + innerRadius);
	for (let r = Math.floor(ty - innerRadius); r <= last; r++) {
		const dy = r + 0.5 - ty;
		if (Math.abs(dy) > innerRadius) continue;
		const h = Math.sqrt(innerRadius * innerRadius - dy * dy);
		const y0 = r * cell + oy;
		rows.push({
			y0,
			y1: y0 + cell,
			x0: Math.floor(tx - h) * cell + ox,
			x1: Math.ceil(tx + h) * cell + ox,
		});
	}
	return rows;
}

/** Same membership rule as `staircaseRows`, for one cell (i, j). */
export function inStaircase(i: number, j: number, tx: number, ty: number, inner: number): boolean {
	if (!(inner > 0)) return false;
	const dy = j + 0.5 - ty;
	if (Math.abs(dy) > inner) return false;
	const h = Math.sqrt(inner * inner - dy * dy);
	return i >= Math.floor(tx - h) && i < Math.ceil(tx + h);
}

export const EMPTY_POLYGON = "polygon(0 0, 0 0, 0 0)";

/** Outline vertices of the rows (right side down, left side up) as [x, y] pairs,
 * with consecutive duplicates removed. */
function staircaseVertices(rows: readonly StairRow[]): [number, number][] {
	const pts: number[] = [];
	for (const r of rows) pts.push(r.x1, r.y0, r.x1, r.y1);
	for (let i = rows.length - 1; i >= 0; i--) {
		const r = rows[i];
		if (r) pts.push(r.x0, r.y1, r.x0, r.y0);
	}
	const out: [number, number][] = [];
	for (let i = 0; i < pts.length; i += 2) {
		if (i > 0 && pts[i] === pts[i - 2] && pts[i + 1] === pts[i - 1]) continue;
		out.push([pts[i] ?? 0, pts[i + 1] ?? 0]);
	}
	return out;
}

/** CSS `polygon()` outlining the rows (right side down, left side up), with
 * consecutive duplicate vertices removed. `EMPTY_POLYGON` when there are no rows. */
export function staircasePolygon(rows: readonly StairRow[]): string {
	if (rows.length === 0) return EMPTY_POLYGON;
	return `polygon(${staircaseVertices(rows)
		.map(([x, y]) => `${x}px ${y}px`)
		.join(", ")})`;
}

/** CSS `clip-path` showing a W × H box except the staircase (an even-odd hole):
 * the old-state layer in contained mode. Just the box when there are no rows. */
export function staircaseHoleClip(rows: readonly StairRow[], W: number, H: number): string {
	let d = `M0 0H${W}V${H}H0Z`;
	const pts = rows.length > 0 ? staircaseVertices(rows) : [];
	if (pts.length > 0) d += `M${pts.map(([x, y]) => `${x} ${y}`).join("L")}Z`;
	return `path(evenodd, "${d}")`;
}

/** The slice of CanvasRenderingContext2D the cores use (a recording fake fits). */
export interface Ctx2D {
	fillStyle: string | CanvasGradient | CanvasPattern;
	globalAlpha: number;
	fillRect(x: number, y: number, w: number, h: number): void;
	clearRect(x: number, y: number, w: number, h: number): void;
	setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
	beginPath?(): void;
	rect?(x: number, y: number, w: number, h: number): void;
	fill?(rule?: CanvasFillRule): void;
}

export interface HaloParams {
	/** Wave origin in grid units of the halo canvas (usually integer + 0.5). */
	cx: number;
	cy: number;
	/** Outer halo radius in cells. */
	R: number;
	/** Halo thickness in cells. */
	halo: number;
	cell: number;
	dot: number;
	/** Grid phase in CSS px. */
	ox: number;
	oy: number;
	/** Canvas size in CSS px. */
	W: number;
	H: number;
	palette: SunPalette;
	/** Device pixel ratio of the canvas backing store. Default 1. */
	dpr?: number;
	/** HDR: every halo square is also pushed here, glowing by depth ({@link haloGlow}). */
	glow?: GlowSink | null;
}

/**
 * Paints the dithered halo band (cells with depth D = (R − d) / halo in [0, 1] and
 * `bayer4 <= D^0.7`), iterating only the ring band of each row. Does not clear.
 * Returns the number of squares drawn.
 */
export function paintHalo(ctx: Ctx2D, p: HaloParams): number {
	const { cx: tx, cy: ty, R, halo, cell, ox, oy } = p;
	if (!(R > 0) || !(halo > 0) || !(cell > 0)) return 0;
	const dpr = p.dpr ?? 1;
	const cols = Math.ceil(p.W / cell) + 1;
	const rows = Math.ceil(p.H / cell) + 1;
	const size = Math.max(1, Math.round(p.dot * dpr));
	const Ri = R - halo;
	let count = 0;
	let lastColor = -1;
	ctx.globalAlpha = 1;
	const yEnd = Math.min(rows, Math.ceil(ty + R));
	for (let y = Math.max(0, Math.floor(ty - R)); y < yEnd; y++) {
		const dy = y + 0.5 - ty;
		const hw = Math.sqrt(Math.max(0, R * R - dy * dy));
		const iw = Ri > 0 && Math.abs(dy) < Ri ? Math.sqrt(Ri * Ri - dy * dy) : -1;
		const skipA = iw > 1 ? Math.ceil(tx - iw + 1) : Infinity;
		const skipB = iw > 1 ? Math.floor(tx + iw - 1) : -Infinity;
		const x1 = Math.min(cols, Math.ceil(tx + hw));
		const py = Math.round((y * cell + oy) * dpr);
		for (let x = Math.max(0, Math.floor(tx - hw)); x < x1; x++) {
			if (x >= skipA && x < skipB) {
				x = skipB - 1;
				continue;
			}
			const D = (R - Math.hypot(x + 0.5 - tx, dy)) / halo;
			if (D < 0 || D > 1 || bayer4(x, y) > haloDensity(D)) continue;
			const ci = haloColorIndex(D);
			if (ci !== lastColor) {
				ctx.fillStyle = p.palette[ci];
				lastColor = ci;
			}
			const px = Math.round((x * cell + ox) * dpr);
			ctx.fillRect(px, py, size, size);
			if (p.glow) p.glow.push(px, py, rgbOf(p.palette[ci]), haloGlow(D));
			count++;
		}
	}
	return count;
}

/** A rectangle in CSS px. */
export interface KeepRect {
	x: number;
	y: number;
	w: number;
	h: number;
}

/**
 * Fills a W × H (CSS px) canvas with `color` except the staircase `hole`, then
 * clears `keep` (the live element, so it stays visible). Uses `fillRect` /
 * `clearRect` only. Does not clear first.
 */
export function paintSheet(
	ctx: Ctx2D,
	color: string,
	W: number,
	H: number,
	dpr: number,
	hole: readonly StairRow[] | null,
	keep?: KeepRect | null
): void {
	const X = (v: number) => Math.round(Math.min(W, Math.max(0, v)) * dpr);
	const Y = (v: number) => Math.round(Math.min(H, Math.max(0, v)) * dpr);
	const band = (x0: number, y0: number, x1: number, y1: number) => {
		const ax = X(x0);
		const ay = Y(y0);
		const w = X(x1) - ax;
		const h = Y(y1) - ay;
		if (w > 0 && h > 0) ctx.fillRect(ax, ay, w, h);
	};
	ctx.globalAlpha = 1;
	ctx.fillStyle = color;
	if (!hole || hole.length === 0) {
		band(0, 0, W, H);
	} else {
		const first = hole[0];
		const last = hole[hole.length - 1];
		if (first) band(0, 0, W, first.y0);
		for (const r of hole) {
			band(0, r.y0, r.x0, r.y1);
			band(r.x1, r.y0, W, r.y1);
		}
		if (last) band(0, last.y1, W, H);
	}
	if (keep && keep.w > 0 && keep.h > 0) {
		const ax = X(keep.x);
		const ay = Y(keep.y);
		const w = X(keep.x + keep.w) - ax;
		const h = Y(keep.y + keep.h) - ay;
		if (w > 0 && h > 0) ctx.clearRect(ax, ay, w, h);
	}
}

export interface LensTarget {
	x: number;
	y: number;
	on: boolean;
}

export interface Lens {
	/** Current centre (cells) and radius (cells). */
	readonly x: number;
	readonly y: number;
	readonly r: number;
	/** Target radius while open. */
	radius: number;
	/**
	 * Advances to `nowMs` toward `target`. The first step after creation or
	 * `resetClock()` counts as one 60 Hz frame; later steps clamp dt to 64 ms.
	 * Returns true while still moving.
	 */
	step(nowMs: number, target: LensTarget, reduced: boolean): boolean;
	/** Forget the last timestamp (call when an idle loop restarts). */
	resetClock(): void;
	/** Whether cell (i, j) is under the lens. */
	covers(i: number, j: number): boolean;
}

/** Soft circular lens: frame-rate independent position lerp, radius eased with
 * 140 ms (open) / 260 ms (close) time constants, snapping within 0.3 cell. */
export function createLens(o: {
	radius: number;
	lerp?: number;
	inMs?: number;
	outMs?: number;
}): Lens {
	const lerp = o.lerp ?? 0.35;
	const inMs = o.inMs ?? 140;
	const outMs = o.outMs ?? 260;
	let x = 0;
	let y = 0;
	let r = 0;
	let on = false;
	let last: number | null = null;
	const lens: Lens = {
		get x() {
			return x;
		},
		get y() {
			return y;
		},
		get r() {
			return r;
		},
		radius: o.radius,
		resetClock() {
			last = null;
		},
		step(nowMs, target, reduced) {
			const frame = 1000 / 60;
			const dt = last === null ? frame : Math.min(64, Math.max(0, nowMs - last));
			last = nowMs;
			if (target.on && !on && r === 0) {
				x = target.x;
				y = target.y;
			}
			on = target.on;
			const g = on ? Math.max(0, lens.radius) : 0;
			if (reduced) {
				x = target.x;
				y = target.y;
				r = g;
				return false;
			}
			const k = 1 - Math.pow(1 - lerp, dt / frame);
			x += (target.x - x) * k;
			y += (target.y - y) * k;
			r += (g - r) * (1 - Math.exp((-3 * dt) / (on ? inMs : outMs)));
			if (Math.abs(g - r) < 0.3) r = g;
			return r !== g || Math.abs(target.x - x) + Math.abs(target.y - y) > 0.05;
		},
		covers(i, j) {
			return r > 0.5 && Math.hypot(i + 0.5 - x, j + 0.5 - y) <= r;
		},
	};
	return lens;
}

export interface SunPainterOptions {
	radius: number;
	cell: number;
	dot: number;
	palette: SunPalette;
	nightAlpha: number;
	horizon: boolean;
	lens: boolean;
	lensRadius: number;
	checked: boolean;
	reducedMotion: boolean;
}

/** The wave front as seen by the painter, in canvas-local CSS px. `R` is the CLIP
 * radius (outer halo radius − haloCells + 0.5, times cell), so the painter's
 * "inside the front" test is exactly the staircase membership of the clip. */
export interface SunFront {
	cx: number;
	cy: number;
	R: number;
	nextChecked: boolean;
	oldInk: string;
}

export interface SunPainter {
	/** Layout keys (radius / cell / dot / horizon) re-raster and resize. */
	setOptions(next: Partial<SunPainterOptions>): void;
	/** Any CSS colour the canvas accepts (the computed `color` of the canvas). */
	setInk(css: string): void;
	/** Pointer in canvas cells; `on` opens / closes the lens. */
	pointer(cellX: number, cellY: number, on: boolean): void;
	setFront(front: SunFront | null): void;
	/** HDR: every painted frame is also handed to `target` (null detaches it). */
	setGlowTarget(target: SunGlowTarget | null): void;
	resize(): void;
	/** Resumes after `sleep()`: paints once and restarts the loop if anything animates. */
	wake(): void;
	/** Suspends the loop (out of view / hidden document). */
	sleep(): void;
	destroy(): void;
}

function mergeOptions(
	base: SunPainterOptions,
	next: Partial<SunPainterOptions>
): SunPainterOptions {
	return {
		radius: next.radius ?? base.radius,
		cell: next.cell ?? base.cell,
		dot: next.dot ?? base.dot,
		palette: next.palette ?? base.palette,
		nightAlpha: next.nightAlpha ?? base.nightAlpha,
		horizon: next.horizon ?? base.horizon,
		lens: next.lens ?? base.lens,
		lensRadius: next.lensRadius ?? base.lensRadius,
		checked: next.checked ?? base.checked,
		reducedMotion: next.reducedMotion ?? base.reducedMotion,
	};
}

/** Paints the sun raster for one frame. Exported for tests (a recording fake fits). */
export function paintSun(
	ctx: Ctx2D,
	raster: SunRaster,
	o: {
		cell: number;
		dot: number;
		dpr: number;
		palette: SunPalette;
		nightAlpha: number;
		checked: boolean;
		ink: string;
		lens: Lens | null;
		front: SunFront | null;
		/** HDR: the day sun and the cells under the lens are also pushed here. */
		glow?: GlowSink | null;
	}
): void {
	const { cell, dpr } = o;
	const size = Math.max(1, Math.round(Math.min(o.dot, cell) * dpr));
	const f = o.front;
	const ftx = f ? f.cx / cell : 0;
	const fty = f ? f.cy / cell : 0;
	const fin = f ? f.R / cell : 0;
	let lastStyle = "";
	let lastAlpha = -1;
	/** Day cells to tint at rest: x, y (device px), ink. */
	const tint: (number | string)[] = [];
	for (const c of raster.cells) {
		let day = o.checked;
		let ink = o.ink;
		if (f) {
			if (inStaircase(c.x, c.y, ftx, fty, fin)) {
				day = f.nextChecked;
			} else {
				day = !f.nextChecked;
				ink = f.oldInk;
			}
		}
		let style: string;
		let alpha: number;
		let mix = 0;
		const lensed = !!o.lens && o.lens.covers(c.x, c.y);
		if (lensed || (c.layer === "sun" && day)) {
			style = o.palette[Math.min(3, Math.max(0, c.color)) as 0 | 1 | 2 | 3];
			alpha = 1;
			if (!lensed) mix = DAY_REST_INK;
		} else {
			style = ink;
			alpha = c.layer === "sun" ? o.nightAlpha : HORIZON_ALPHA;
		}
		if (alpha <= 0) continue;
		const px = Math.round(c.x * cell * dpr);
		const py = Math.round(c.y * cell * dpr);
		if (o.glow && alpha === 1) {
			const rgb = rgbOf(style);
			if (lensed) {
				o.glow.push(px, py, rgb, c.layer === "sun" ? SUN_GLOW_LENS : HORIZON_GLOW_LENS);
			} else if (mix > 0 && rgb >= 0) {
				// Day at rest: the colour the 2D canvas ends with after the ink tint.
				const inkC = parseInk(ink);
				const inkRgb = rgbOf(ink);
				const t = inkC && inkRgb >= 0 ? mix * inkC.a : 0;
				o.glow.push(px, py, t > 0 ? mixRgb(rgb, inkRgb, t) : rgb, SUN_GLOW_DAY);
			}
		}
		if (style !== lastStyle) {
			ctx.fillStyle = style;
			lastStyle = style;
		}
		if (alpha !== lastAlpha) {
			ctx.globalAlpha = alpha;
			lastAlpha = alpha;
		}
		ctx.fillRect(px, py, size, size);
		if (mix > 0) tint.push(px, py, ink);
	}
	// Day at rest: tint the colour toward the cell's ink (one pass, cells never
	// overlap); the lens shows it pure.
	for (let i = 0; i < tint.length; i += 3) {
		const style = tint[i + 2] as string;
		if (style !== lastStyle) {
			ctx.fillStyle = style;
			lastStyle = style;
		}
		if (lastAlpha !== DAY_REST_INK) {
			ctx.globalAlpha = DAY_REST_INK;
			lastAlpha = DAY_REST_INK;
		}
		ctx.fillRect(tint[i] as number, tint[i + 1] as number, size, size);
	}
	ctx.globalAlpha = 1;
}

/**
 * Creates the painter for the switch canvas. Returns null when no 2D context is
 * available (jsdom, SSR). The rAF loop runs only while the lens moves or a wave
 * front is set; otherwise the canvas is painted once and the loop sleeps.
 */
export function createSunPainter(
	canvas: HTMLCanvasElement,
	opts: SunPainterOptions
): SunPainter | null {
	const maybe =
		typeof canvas.getContext === "function"
			? (canvas.getContext("2d") as unknown as Ctx2D | null)
			: null;
	if (!maybe) return null;
	const ctx: Ctx2D = maybe;

	let o = mergeOptions(opts, {});
	let raster = rasterSun({ radius: o.radius, horizon: o.horizon });
	let ink = "rgb(0, 0, 0)";
	let dpr = 1;
	let front: SunFront | null = null;
	let glowTarget: SunGlowTarget | null = null;
	const lens = createLens({ radius: o.lensRadius });
	const target: LensTarget = { x: 0, y: 0, on: false };
	let raf = 0;
	let suspended = false;
	let destroyed = false;
	let dirty = false;

	const g = globalThis as {
		requestAnimationFrame?: (cb: (t: number) => void) => number;
		cancelAnimationFrame?: (id: number) => void;
		devicePixelRatio?: number;
		performance?: { now(): number };
	};
	const request = (cb: (t: number) => void): number =>
		g.requestAnimationFrame ? g.requestAnimationFrame(cb) : 0;
	const cancel = (id: number) => {
		if (id && g.cancelAnimationFrame) g.cancelAnimationFrame(id);
	};

	function paint() {
		dirty = false;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		const hdr = glowTarget;
		hdr?.sink.clear();
		paintSun(ctx, raster, {
			cell: o.cell,
			dot: o.dot,
			dpr,
			palette: o.palette,
			nightAlpha: o.nightAlpha,
			checked: o.checked,
			ink,
			lens: o.lens ? lens : null,
			front,
			glow: hdr?.sink ?? null,
		});
		hdr?.render(
			canvas.width,
			canvas.height,
			Math.max(1, Math.round(Math.min(o.dot, o.cell) * dpr))
		);
	}

	function frame(now: number) {
		raf = 0;
		if (destroyed || suspended) return;
		const moving = o.lens ? lens.step(now, target, o.reducedMotion) : false;
		paint();
		if (moving || front) raf = request(frame);
	}

	/** Schedules one frame (which keeps looping while anything animates). */
	function kick() {
		if (destroyed) return;
		if (suspended) {
			dirty = true;
			return;
		}
		if (raf) return;
		if (!g.requestAnimationFrame) {
			paint();
			return;
		}
		lens.resetClock();
		raf = request(frame);
	}

	function resize() {
		if (destroyed) return;
		dpr = g.devicePixelRatio && g.devicePixelRatio > 0 ? g.devicePixelRatio : 1;
		const css = raster.size * o.cell;
		const w = Math.max(1, Math.round(css * dpr));
		if (canvas.width !== w) canvas.width = w;
		if (canvas.height !== w) canvas.height = w;
		if (suspended) dirty = true;
		else paint();
	}

	resize();

	return {
		setOptions(next) {
			if (destroyed) return;
			const prev = o;
			o = mergeOptions(o, next);
			lens.radius = o.lensRadius;
			if (o.radius !== prev.radius || o.horizon !== prev.horizon) {
				raster = rasterSun({ radius: o.radius, horizon: o.horizon });
			}
			if (o.radius !== prev.radius || o.cell !== prev.cell || o.horizon !== prev.horizon) {
				resize();
			}
			kick();
		},
		setInk(css) {
			if (destroyed || !css || css === ink) return;
			ink = css;
			kick();
		},
		pointer(cellX, cellY, on) {
			if (destroyed) return;
			target.x = cellX;
			target.y = cellY;
			target.on = on && o.lens;
			kick();
		},
		setFront(next) {
			if (destroyed) return;
			front = next;
			kick();
		},
		setGlowTarget(next) {
			if (destroyed) return;
			glowTarget = next;
			if (suspended) dirty = true;
			else paint();
		},
		resize,
		wake() {
			if (destroyed) return;
			const was = suspended;
			suspended = false;
			if (was || dirty) {
				lens.resetClock();
				paint();
			}
			if (!raf && (front || (o.lens && (target.on || lens.r > 0)))) {
				lens.resetClock();
				raf = request(frame);
			}
		},
		sleep() {
			suspended = true;
			cancel(raf);
			raf = 0;
		},
		destroy() {
			destroyed = true;
			cancel(raf);
			raf = 0;
			front = null;
		},
	};
}
