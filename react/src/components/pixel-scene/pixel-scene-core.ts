/**
 * PixelScene core — the framework-free engine, byte-identical in the Svelte,
 * React and Vue trees (see shared-cores.json).
 *
 * A picture is a grid of square cells. Every frame a scene painter fills the
 * grid through `writeCell` (the `put()` grammar below), `pixelHalos` adds the
 * dithered light cells around emitters, and `paintGrid` draws one square dot
 * per cell into a 2D canvas: sparse ink dots outside the lens, full colour
 * under it, lit cells in colour everywhere. Cells with `glow > 0` are handed
 * to the optional HDR layer through `onFrame`.
 *
 * First the pure helpers (hash, Bayer, noise, packed colours), then the grid,
 * the lens, the painter, and `createPixelScene`, the engine that owns the
 * canvas, the rAF loop, the pointer listeners and every observer. No
 * framework imports, and nothing touches `window` or `document` at module
 * scope, so the file is safe to import on the server.
 *
 * Colours are packed `0xRRGGBB` integers (`-1` = empty cell). Scenes may still
 * pass `"#hex"` literals; `parseColour` caches them. No CSS string is built
 * per cell.
 *
 * Compiles under `noUncheckedIndexedAccess`. The `!` assertions are in bounds
 * by construction (indices come from loops over the arrays' own sizes).
 */

// --- pure helpers ------------------------------------------------------------

/** 4×4 ordered-dither thresholds, centred in (0, 1). */
export const BAYER: readonly number[] = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(
	(v) => (v + 0.5) / 16
);

/** Ordered-dither threshold of a cell, one of 16 levels in (0, 1). */
export function bayer(x: number, y: number): number {
	return BAYER[(((y % 4) + 4) % 4) * 4 + (((x % 4) + 4) % 4)]!;
}

/** Deterministic hash of a cell and a seed, in [0, 1). */
export function hash(x: number, y: number, s = 0): number {
	let h = (x * 374761393 + y * 668265263 + s * 2246822519) >>> 0;
	h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function clamp(v: number, a: number, b: number): number {
	return Math.max(a, Math.min(b, v));
}

/** Smoothstep on [0, 1], clamped. */
export function smooth(t: number): number {
	t = clamp(t, 0, 1);
	return t * t * (3 - 2 * t);
}

/** 1D value noise in [0, 1). */
export function noise1(x: number, seed: number): number {
	const i = Math.floor(x);
	const f = x - i;
	const a = hash(i, 0, seed);
	const b = hash(i + 1, 0, seed);
	return a + (b - a) * smooth(f);
}

/** Two octaves of value noise: a ridge line `amp` tall over `scale` cells. */
export function ridge(x: number, seed: number, scale: number, amp: number): number {
	return noise1(x / scale, seed) * amp + noise1(x / (scale * 0.37), seed + 1) * amp * 0.35;
}

// --- packed colours ----------------------------------------------------------

/** A colour as scenes write it: a `"#hex"` / `rgb()` string or a packed int. */
export type Colour = string | number;

const PARSED = new Map<string, number>();
const RGB_RE = /^rgba?\(\s*(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)/i;

/** `#rgb`, `#rrggbb` or `rgb()` → `0xRRGGBB`; a packed int passes through; anything else → -1. */
export function parseColour(c: Colour): number {
	if (typeof c === "number") return c;
	const hit = PARSED.get(c);
	if (hit !== undefined) return hit;
	let v = -1;
	const s = c.trim();
	if (/^#[0-9a-f]{6}$/i.test(s)) v = parseInt(s.slice(1), 16);
	else if (/^#[0-9a-f]{3}$/i.test(s)) {
		const r = parseInt(s[1]!, 16);
		const g = parseInt(s[2]!, 16);
		const b = parseInt(s[3]!, 16);
		v = ((r * 17) << 16) | ((g * 17) << 8) | (b * 17);
	} else {
		const m = RGB_RE.exec(s);
		if (m) {
			const r = clamp(Math.round(Number(m[1])), 0, 255);
			const g = clamp(Math.round(Number(m[2])), 0, 255);
			const b = clamp(Math.round(Number(m[3])), 0, 255);
			v = (r << 16) | (g << 8) | b;
		}
	}
	if (PARSED.size < 4096) PARSED.set(c, v);
	return v;
}

/** Linear mix of two colours, channels truncated as the prototype's `rgb()` did. */
export function mixHex(a: Colour, b: Colour, t: number): number {
	const A = parseColour(a);
	const B = parseColour(b);
	const ar = (A >> 16) & 255;
	const ag = (A >> 8) & 255;
	const ab = A & 255;
	const r = clamp((ar + (((B >> 16) & 255) - ar) * t) | 0, 0, 255);
	const g = clamp((ag + (((B >> 8) & 255) - ag) * t) | 0, 0, 255);
	const bl = clamp((ab + ((B & 255) - ab) * t) | 0, 0, 255);
	return (r << 16) | (g << 8) | bl;
}

/** Gradient through `[position, colour]` stops at `t` in [0, 1]. */
export function grad(stops: readonly (readonly [number, Colour])[], t: number): number {
	t = clamp(t, 0, 1);
	for (let i = 1; i < stops.length; i++) {
		const s1 = stops[i]!;
		if (t <= s1[0]) {
			const s0 = stops[i - 1]!;
			return mixHex(s0[1], s1[1], (t - s0[0]) / (s1[0] - s0[0] || 1));
		}
	}
	const last = stops[stops.length - 1];
	return last ? parseColour(last[1]) : 0;
}

const CSS_CACHE = new Map<number, string>();

/** Packed colour → cached `#rrggbb`. */
export function cssOf(c: number): string {
	let s = CSS_CACHE.get(c);
	if (s === undefined) {
		s = "#" + (c & 0xffffff).toString(16).padStart(6, "0");
		if (CSS_CACHE.size < 4096) CSS_CACHE.set(c, s);
	}
	return s;
}

const LINEAR = new Float32Array(256);
for (let i = 0; i < 256; i++) {
	const s = i / 255;
	LINEAR[i] = s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** sRGB channel 0–255 → linear light 0–1 (lookup table). */
export function srgbToLinear(c8: number): number {
	return LINEAR[clamp(Math.round(c8), 0, 255)]!;
}

/** Linear light → extended-sRGB encoded value; keeps going above 1 for HDR. */
export function encodeExt(v: number): number {
	return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

// --- grid --------------------------------------------------------------------

export interface PixelGrid {
	cols: number;
	rows: number;
	/** -1 = empty, else 0xRRGGBB — what the lens shows. */
	color: Int32Array;
	/** Dot alpha outside the lens (0 = no dot). */
	inkA: Float32Array;
	/** 1 = colour shown outside the lens too. */
	lit: Uint8Array;
	/** HDR multiple of SDR white, 0 = SDR only. */
	glow: Float32Array;
	/** Emitter halo radius in cells (0 = not an emitter). */
	halo: Float32Array;
	/** Halo colour override for the HDR layer, -1 = none. */
	hcol: Int32Array;
	/** Flat `[x, y, colour, glow, haloCells] × n`. */
	emitters: number[];
	/**
	 * The copy corner, in cells from the top-left (0 = none): lens cells inside
	 * it are not boosted, so text over the picture keeps SDR contrast. Set by
	 * the painter each frame.
	 */
	copyW: number;
	copyH: number;
	/** Centre of the sun (or moon) in cells, -1 when the frame has none. Set by the painter. */
	sunX: number;
	sunY: number;
}

export const INK_ALPHA_NIGHT = 0.6;
export const INK_ALPHA_DAY = 0.85;
/** Glow of every cell revealed by the lens. */
export const LENS_BOOST = 1.6;
/** Glow of a cell written with `l = true`. */
export const LIT_GLOW = 1.5;
/** Highest glow a cell may carry (≈ 1000 nits over a 203-nit SDR white). */
export const GLOW_PEAK = 4.9;
export const MAX_CELLS = 72_000;
export const MAX_DPR = 2;
/** Backing-store budget per canvas, device px (2048²): past it the backing drops to DPR 1. */
export const MAX_BACKING_PX = 4_200_000;
export const MIN_CELL = 4;
export const MAX_CELL = 32;

export function createGrid(cols: number, rows: number): PixelGrid {
	const n = Math.max(0, cols * rows);
	const g: PixelGrid = {
		cols,
		rows,
		color: new Int32Array(n),
		inkA: new Float32Array(n),
		lit: new Uint8Array(n),
		glow: new Float32Array(n),
		halo: new Float32Array(n),
		hcol: new Int32Array(n),
		emitters: [],
		copyW: 0,
		copyH: 0,
		sunX: -1,
		sunY: -1,
	};
	clearGrid(g);
	return g;
}

export function clearGrid(g: PixelGrid): void {
	g.color.fill(-1);
	g.inkA.fill(0);
	g.lit.fill(0);
	g.glow.fill(0);
	g.halo.fill(0);
	g.hcol.fill(-1);
	g.emitters.length = 0;
	g.copyW = 0;
	g.copyH = 0;
	g.sunX = -1;
	g.sunY = -1;
}

/**
 * The prototype's `put()`. `a` is the dot alpha outside the lens. `l`: false =
 * plain cell, true = lit (colour outside the lens, glow {@link LIT_GLOW}),
 * number = lit and HDR at that multiple of SDR white (clamped to
 * {@link GLOW_PEAK}). `hl > 0` with a numeric `l` registers an emitter whose
 * dithered halo `pixelHalos` adds. Out-of-bounds cells are ignored.
 */
export function writeCell(
	g: PixelGrid,
	x: number,
	y: number,
	c: Colour,
	a = 0,
	l: boolean | number = false,
	hl = 0
): void {
	x = Math.round(x);
	y = Math.round(y);
	if (!(x >= 0 && y >= 0 && x < g.cols && y < g.rows)) return;
	const i = y * g.cols + x;
	const col = typeof c === "number" ? c : parseColour(c);
	g.color[i] = col;
	g.inkA[i] = a;
	g.lit[i] = l ? 1 : 0;
	const glow = typeof l === "number" ? Math.min(GLOW_PEAK, l) : l ? LIT_GLOW : 0;
	g.glow[i] = glow;
	g.halo[i] = hl;
	g.hcol[i] = -1;
	if (hl > 0 && typeof l === "number" && glow > 0) g.emitters.push(x, y, col, glow, hl);
}

/**
 * Around every emitter, light neighbouring cells as hard squares, Bayer
 * dithered so density and brightness fall with distance. No blur anywhere.
 */
export function pixelHalos(g: PixelGrid): void {
	const { cols, rows, emitters, glow, halo, color, hcol } = g;
	for (let e = 0; e + 4 < emitters.length; e += 5) {
		const ex = emitters[e]!;
		const ey = emitters[e + 1]!;
		const c = emitters[e + 2]!;
		const l = emitters[e + 3]!;
		const r = emitters[e + 4]! * 2.2;
		const y0 = Math.max(0, Math.floor(ey - r));
		const y1 = Math.min(rows - 1, Math.ceil(ey + r));
		const x0 = Math.max(0, Math.floor(ex - r));
		const x1 = Math.min(cols - 1, Math.ceil(ex + r));
		for (let y = y0; y <= y1; y++) {
			for (let x = x0; x <= x1; x++) {
				const i = y * cols + x;
				if (halo[i]! > 0) continue; // emitters stay as they are
				const d = Math.hypot(x - ex, y - ey) / r;
				if (d >= 1) continue;
				const dens = Math.pow(1 - d, 1.7);
				if (bayer(x, y) >= dens) continue;
				const gl = l * (0.3 + 0.55 * dens);
				if (gl <= glow[i]!) continue;
				glow[i] = gl;
				hcol[i] = c;
				if (color[i]! < 0) color[i] = c;
			}
		}
	}
}

// --- day / night wave --------------------------------------------------------

/** Duration of a day / night wave, ms (ease in-out cubic). */
export const WAVE_MS = 1300;
/** Thickness of the dithered halo that leads the wave front, in cells. */
export const WAVE_HALO_CELLS = 9;
/** Halo colours from the sparse outer fringe to the dense inner rim. */
export const WAVE_PALETTE: readonly number[] = [0xf7cf4a, 0xf6a24e, 0xef7a5e, 0xea7d9c];

export function easeInOutCubic(t: number): number {
	if (!(t > 0)) return 0;
	if (t >= 1) return 1;
	return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** Glow of a halo cell at depth D (1 = inner rim, 0 = outer fringe). */
export function waveGlow(D: number): number {
	return 1.5 + 3.4 * clamp(D, 0, 1);
}

/** Radius (cells) at which a front from (ox, oy) has passed every cell, halo included. */
export function waveCover(ox: number, oy: number, cols: number, rows: number): number {
	return (
		Math.max(
			Math.hypot(ox, oy),
			Math.hypot(cols - ox, oy),
			Math.hypot(ox, rows - oy),
			Math.hypot(cols - ox, rows - oy)
		) +
		WAVE_HALO_CELLS +
		1
	);
}

/**
 * Composites one wave frame into `cur` (the old picture): cells the front has
 * passed (`dist < R − halo`) take `next`'s content, the halo band is
 * Bayer-dithered with `D^0.7` and lit at {@link waveGlow} (SDR inside the copy
 * corner), the rest keeps the old picture. Emitters follow their side.
 * `side[i]` is set to 1 for cells on the new side, 0 elsewhere.
 */
export function composeWave(
	cur: PixelGrid,
	next: PixelGrid,
	side: Uint8Array,
	ox: number,
	oy: number,
	R: number
): void {
	const { cols, rows } = cur;
	const Rin = R - WAVE_HALO_CELLS;
	const em: number[] = [];
	for (let k = 0; k + 4 < cur.emitters.length; k += 5)
		if (Math.hypot(cur.emitters[k]! + 0.5 - ox, cur.emitters[k + 1]! + 0.5 - oy) >= Rin)
			em.push(...cur.emitters.slice(k, k + 5));
	for (let k = 0; k + 4 < next.emitters.length; k += 5)
		if (Math.hypot(next.emitters[k]! + 0.5 - ox, next.emitters[k + 1]! + 0.5 - oy) < Rin)
			em.push(...next.emitters.slice(k, k + 5));
	const copyW = next.copyW || cur.copyW || 0;
	const copyH = next.copyH || cur.copyH || 0;
	for (let y = 0; y < rows; y++) {
		for (let x = 0; x < cols; x++) {
			const i = y * cols + x;
			const dist = Math.hypot(x + 0.5 - ox, y + 0.5 - oy);
			if (dist < Rin) {
				side[i] = 1;
				cur.color[i] = next.color[i]!;
				cur.inkA[i] = next.inkA[i]!;
				cur.lit[i] = next.lit[i]!;
				cur.glow[i] = next.glow[i]!;
				cur.halo[i] = next.halo[i]!;
				cur.hcol[i] = next.hcol[i]!;
				continue;
			}
			side[i] = 0;
			if (dist >= R) continue;
			const D = (R - dist) / WAVE_HALO_CELLS;
			if (bayer(x, y) > Math.pow(D, 0.7)) continue;
			cur.color[i] = WAVE_PALETTE[clamp(Math.floor(D * 4), 0, 3)]!;
			cur.inkA[i] = 0.9;
			cur.lit[i] = 1;
			cur.glow[i] = x < copyW && y < copyH ? 1 : waveGlow(D);
			cur.halo[i] = 0;
			cur.hcol[i] = -1;
		}
	}
	cur.emitters.length = 0;
	cur.emitters.push(...em);
}

// --- lens --------------------------------------------------------------------

export interface Lens {
	x: number;
	y: number;
	tx: number;
	ty: number;
	r: number;
	tr: number;
}

export function createLens(): Lens {
	return { x: -999, y: -999, tx: -999, ty: -999, r: 0, tr: 0 };
}

/**
 * Moves the lens toward its target, frame-rate independent (`k = 1 − 0.6^(dt/16.667)`;
 * the radius opens 1.3× and closes 0.7× as fast). `snap` jumps to the target.
 * Returns whether it is still moving.
 */
export function stepLens(l: Lens, dt: number, snap: boolean): boolean {
	if (snap) {
		l.x = l.tx;
		l.y = l.ty;
		l.r = l.tr;
		return false;
	}
	const f = Math.max(0, dt) / 16.667;
	const k = 1 - Math.pow(0.6, f);
	l.x += (l.tx - l.x) * k;
	l.y += (l.ty - l.y) * k;
	const kr = 1 - Math.pow(0.6, f * (l.tr > l.r ? 1.3 : 0.7));
	l.r += (l.tr - l.r) * kr;
	let moving = false;
	if (Math.abs(l.tx - l.x) > 0.01) moving = true;
	else l.x = l.tx;
	if (Math.abs(l.ty - l.y) > 0.01) moving = true;
	else l.y = l.ty;
	if (Math.abs(l.tr - l.r) > 0.01) moving = true;
	else l.r = l.tr;
	return moving;
}

/** Whether a cell is revealed: inside the radius, with a Bayer-dithered rim. */
export function inLens(l: Lens, x: number, y: number): boolean {
	return l.r > 0.5 && Math.hypot(x + 0.5 - l.x, y + 0.5 - l.y) < l.r - 2 + bayer(x, y) * 4;
}

// --- painter -----------------------------------------------------------------

export interface PaintParams {
	/** Grid pitch in CSS px. */
	cell: number;
	/** Dot edge in CSS px. */
	dot: number;
	dpr: number;
	/** Resting dot colour, any canvas colour string. */
	ink: string;
	night: boolean;
	/** During a wave: cells with `side[i] === 1` use the ink alpha of `night` = `sideNight`. */
	side?: Uint8Array | null;
	sideNight?: boolean;
	/** Backing-store size to clear, device px (defaults to `ctx.canvas`). */
	width?: number;
	height?: number;
}

/** Device-pixel origin of cell `x` (or row `y`); the HDR layer uses the same expression. */
export function cellOrigin(x: number, cell: number, dpr: number): number {
	return Math.round(x * cell * dpr);
}

/**
 * One 2D pass over the grid. Raises the glow of lens cells to at least
 * {@link LENS_BOOST} (mutates `g.glow`, as the HDR layer reads it next),
 * except inside the copy corner (`g.copyW × g.copyH`).
 */
export function paintGrid(
	ctx: CanvasRenderingContext2D,
	g: PixelGrid,
	lens: Lens,
	p: PaintParams
): void {
	const { cols, rows, color, inkA, lit, glow } = g;
	const copyW = g.copyW || 0;
	const copyH = g.copyH || 0;
	const w = p.width ?? ctx.canvas?.width ?? 0;
	const h = p.height ?? ctx.canvas?.height ?? 0;
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.clearRect(0, 0, w, h);
	const size = Math.max(1, Math.round(p.dot * p.dpr));
	const inkScale = p.night ? INK_ALPHA_NIGHT : INK_ALPHA_DAY;
	const side = p.side ?? null;
	const sideScale = p.sideNight ? INK_ALPHA_NIGHT : INK_ALPHA_DAY;
	const open = lens.r > 0.5;
	// lens bounding box in cells (rim reaches r + 2)
	const lx0 = open ? Math.floor(lens.x - lens.r - 3) : 1;
	const lx1 = open ? Math.ceil(lens.x + lens.r + 3) : 0;
	const ly0 = open ? Math.floor(lens.y - lens.r - 3) : 1;
	const ly1 = open ? Math.ceil(lens.y + lens.r + 3) : 0;
	let curStyle = -2; // -2 = nothing set, -1 = ink, else the colour
	let curAlpha = -1;
	ctx.globalAlpha = 1;
	for (let y = 0; y < rows; y++) {
		const oy = cellOrigin(y, p.cell, p.dpr);
		const rowLens = y >= ly0 && y <= ly1;
		for (let x = 0; x < cols; x++) {
			const i = y * cols + x;
			const c = color[i]!;
			if (c < 0) continue;
			let style: number;
			let alpha: number;
			if (rowLens && x >= lx0 && x <= lx1 && inLens(lens, x, y)) {
				style = c;
				alpha = 1;
				if (glow[i]! < LENS_BOOST && !(x < copyW && y < copyH)) glow[i] = LENS_BOOST;
			} else if (lit[i]) {
				style = c;
				alpha = 1;
			} else {
				const a = inkA[i]!;
				if (!(a > 0)) continue;
				style = -1;
				alpha = Math.min(1, a * (side && side[i] === 1 ? sideScale : inkScale));
			}
			if (style !== curStyle) {
				ctx.fillStyle = style < 0 ? p.ink : cssOf(style);
				curStyle = style;
			}
			if (alpha !== curAlpha) {
				ctx.globalAlpha = alpha;
				curAlpha = alpha;
			}
			ctx.fillRect(cellOrigin(x, p.cell, p.dpr), oy, size, size);
		}
	}
	ctx.globalAlpha = 1;
}

/**
 * Clamps `cell` to [4, 32] and `dot` to [1, cell], then grows the cell on big
 * boxes so the grid stays under {@link MAX_CELLS}; the dot keeps its ratio.
 */
export function effectiveCell(
	cssW: number,
	cssH: number,
	cell: number,
	dot: number
): { cell: number; dot: number } {
	let c = Number.isFinite(cell) ? clamp(cell, MIN_CELL, MAX_CELL) : 5;
	let d = Number.isFinite(dot) ? clamp(dot, 1, c) : Math.min(4, c);
	const W = Math.max(0, cssW);
	const H = Math.max(0, cssH);
	if (Math.ceil(W / c) * Math.ceil(H / c) > MAX_CELLS) {
		const base = c;
		c = Math.max(c, Math.ceil(Math.sqrt((W * H) / MAX_CELLS)));
		while (Math.ceil(W / c) * Math.ceil(H / c) > MAX_CELLS) c++;
		d = Math.max(1, Math.min(c, Math.round((d * c) / base)));
	}
	return { cell: c, dot: d };
}

/**
 * The backing-store DPR for a box: the device DPR (already capped at
 * {@link MAX_DPR}), or 1 when that would exceed {@link MAX_BACKING_PX}. The
 * canvas is then upscaled with `image-rendering: pixelated`, so the squares
 * stay hard.
 */
export function backingDpr(cssW: number, cssH: number, deviceDpr: number): number {
	const d = Number.isFinite(deviceDpr) && deviceDpr > 0 ? deviceDpr : 1;
	return d > 1 && Math.max(0, cssW) * Math.max(0, cssH) * d * d > MAX_BACKING_PX ? 1 : d;
}

// --- engine ------------------------------------------------------------------

/** Paints one frame of a scene into the grid. Must be synchronous. */
export type ScenePainter = (t: number, g: PixelGrid, night: boolean) => void;

/** What the HDR layer reads after each painted frame (device px, live views — read synchronously). */
export interface PixelSceneFrame {
	cols: number;
	rows: number;
	/** Backing-store size, device px. */
	width: number;
	height: number;
	/** `cell × dpr`; a cell's origin is `round(x · cellCss · dpr)`. */
	pitch: number;
	/** Dot edge, device px: `round(dot · dpr)`. */
	size: number;
	cellCss: number;
	dpr: number;
	/** True when the backing is below the device resolution (see {@link backingDpr}). */
	pixelated?: boolean;
	color: Int32Array;
	glow: Float32Array;
	hcol: Int32Array;
}

export interface PixelSceneElements {
	host: HTMLElement;
	canvas: HTMLCanvasElement;
}

export interface PixelSceneOptions {
	painter: ScenePainter;
	night?: boolean;
	cell?: number;
	dot?: number;
	lens?: boolean;
	lensRadius?: number;
	ink?: string;
	paused?: boolean;
	/** Animate a change of `night` as a wave from the sun (default true; never under reduced motion). */
	wave?: boolean;
	/** Override for tests; default = the live `prefers-reduced-motion` query. */
	reducedMotion?: boolean;
	/** HDR hook; a throwing callback is dropped and the 2D picture keeps going. */
	onFrame?: ((f: PixelSceneFrame) => void) | null;
}

export interface PixelSceneEngine {
	/** Absent or undefined keys are left untouched; `onFrame: null` clears the hook. */
	setOptions(next: Partial<PixelSceneOptions>): void;
	resize(): void;
	destroy(): void;
}

export function normalizeLensRadius(r: number | undefined): number {
	return typeof r === "number" && Number.isFinite(r) ? clamp(r, 2, 200) : 21;
}

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const INK_FALLBACK = "#808080";

/** null when there is no 2D context (server, jsdom) — the component then keeps an inert canvas. */
export function createPixelScene(
	el: PixelSceneElements,
	options: PixelSceneOptions
): PixelSceneEngine | null {
	const { host, canvas } = el;
	let ctx: CanvasRenderingContext2D | null = null;
	try {
		ctx = canvas.getContext("2d");
	} catch {
		ctx = null;
	}
	if (!ctx) return null;
	const c2d = ctx;

	let painter = options.painter;
	let night = !!options.night;
	let cellOpt = options.cell ?? 5;
	let dotOpt = options.dot ?? 4;
	let lensOn = options.lens ?? true;
	let lensRadius = normalizeLensRadius(options.lensRadius);
	let inkOpt = options.ink ?? "currentColor";
	let paused = !!options.paused;
	let waveOn = options.wave ?? true;
	let rmOverride: boolean | undefined = options.reducedMotion;
	let onFrame = options.onFrame ?? null;

	let mq: MediaQueryList | null = null;
	let mqReduced = false;
	if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
		try {
			mq = window.matchMedia("(prefers-reduced-motion: reduce)");
			mqReduced = mq.matches;
		} catch {
			mq = null;
		}
	}
	const reduced = () => (rmOverride !== undefined ? rmOverride : mqReduced);

	let grid = createGrid(0, 0);
	/** The new theme's picture during a wave. */
	let nextGrid = createGrid(0, 0);
	let side = new Uint8Array(0);
	const wave = { on: false, from: false, ox: 0, oy: 0, start: -1, cover: 0 };
	let cssW = 0;
	let cssH = 0;
	let dpr = 1;
	/** The device DPR `dpr` was derived from; a change triggers a relayout. */
	let deviceDpr = 1;
	let cell = 5;
	let dot = 4;
	let t = 0;
	let last = 0;
	let raf = 0;
	let dirty = true;
	let lensMoving = false;
	let inView = true;
	let destroyed = false;
	let ink = INK_FALLBACK;
	let inkAt = -Infinity;
	let inkTimer: ReturnType<typeof setTimeout> | 0 = 0;
	const lens = createLens();
	const frame: PixelSceneFrame = {
		cols: 0,
		rows: 0,
		width: 0,
		height: 0,
		pitch: 0,
		size: 0,
		cellCss: 0,
		dpr: 1,
		pixelated: false,
		color: grid.color,
		glow: grid.glow,
		hcol: grid.hcol,
	};

	const readDpr = () =>
		typeof window !== "undefined" && window.devicePixelRatio > 0
			? Math.min(MAX_DPR, window.devicePixelRatio)
			: 1;

	function resolveInk(now: number, force: boolean): void {
		if (HEX_RE.test(inkOpt.trim())) {
			ink = inkOpt.trim();
			return;
		}
		if (!force && now - inkAt < 250) return;
		inkAt = now;
		try {
			if (inkOpt.trim().toLowerCase() !== "currentcolor") {
				// any other CSS colour the canvas understands goes through as is
				ink = inkOpt;
				return;
			}
			const col = typeof getComputedStyle === "function" ? getComputedStyle(host).color : "";
			ink = col || INK_FALLBACK;
		} catch {
			ink = INK_FALLBACK;
		}
	}

	/** `currentColor` is the only ink that can change under a sleeping engine. */
	const inkFollowsHost = () => inkOpt.trim().toLowerCase() === "currentcolor";

	/** Re-reads a `currentColor` ink and repaints once if it changed. */
	function refreshInk(): void {
		if (destroyed || !inkFollowsHost()) return;
		const before = ink;
		resolveInk(typeof performance !== "undefined" ? performance.now() : 0, true);
		if (ink !== before) wake();
	}

	/**
	 * While the loop sleeps in view (paused, reduced motion, lens at rest), a
	 * slow timer re-reads `currentColor`, so a theme change applied anywhere
	 * up the tree (or through a colour transition) still reaches the dots.
	 */
	function armInkPoll(): void {
		if (inkTimer || destroyed || !inkFollowsHost() || typeof setTimeout !== "function") return;
		inkTimer = setTimeout(() => {
			inkTimer = 0;
			if (destroyed || raf || !awake()) return;
			refreshInk();
			if (!raf) armInkPoll();
		}, 500);
	}
	function clearInkPoll(): void {
		if (inkTimer && typeof clearTimeout === "function") clearTimeout(inkTimer);
		inkTimer = 0;
	}

	function layout(): void {
		cssW = host.clientWidth || 0;
		cssH = host.clientHeight || 0;
		deviceDpr = readDpr();
		dpr = backingDpr(cssW, cssH, deviceDpr);
		const pixelated = dpr < deviceDpr;
		frame.pixelated = pixelated;
		const rendering = pixelated ? "pixelated" : "";
		if (canvas.style && canvas.style.imageRendering !== rendering)
			canvas.style.imageRendering = rendering;
		const eff = effectiveCell(cssW, cssH, cellOpt, dotOpt);
		cell = eff.cell;
		dot = eff.dot;
		const cols = cssW > 0 ? Math.ceil(cssW / cell) : 0;
		const rows = cssH > 0 ? Math.ceil(cssH / cell) : 0;
		if (cols !== grid.cols || rows !== grid.rows) {
			grid = createGrid(cols, rows);
			nextGrid = createGrid(cols, rows);
			side = new Uint8Array(cols * rows);
			frame.color = grid.color;
			frame.glow = grid.glow;
			frame.hcol = grid.hcol;
		}
		const bw = Math.round(cssW * dpr);
		const bh = Math.round(cssH * dpr);
		if (canvas.width !== bw) canvas.width = bw;
		if (canvas.height !== bh) canvas.height = bh;
		dirty = true;
	}

	const docHidden = () => typeof document !== "undefined" && document.hidden === true;
	const awake = () => inView && !docHidden() && grid.cols * grid.rows > 0 && !destroyed;
	const animating = () => !paused && !reduced();

	function schedule(): void {
		if (raf || destroyed) return;
		if (!awake() || !(animating() || lensMoving || dirty || wave.on)) {
			last = 0;
			if (awake()) armInkPoll();
			else clearInkPoll();
			return;
		}
		if (typeof requestAnimationFrame !== "function") return;
		clearInkPoll();
		raf = requestAnimationFrame(tick);
	}

	/** Starts a wave from the sun of either picture, else the lens, else the top right. */
	function startWave(from: boolean, to: boolean): void {
		clearGrid(nextGrid);
		painter(t, nextGrid, to);
		let ox = grid.sunX >= 0 ? grid.sunX : nextGrid.sunX;
		let oy = grid.sunX >= 0 ? grid.sunY : nextGrid.sunY;
		if (!(ox >= 0)) {
			const lensed = lens.r > 0.5 || lens.tr > 0;
			ox = lensed ? lens.tx : grid.cols * 0.85;
			oy = lensed ? lens.ty : grid.rows * 0.2;
		}
		wave.on = true;
		wave.from = from;
		wave.ox = ox;
		wave.oy = oy;
		wave.start = -1;
		wave.cover = waveCover(ox, oy, grid.cols, grid.rows);
	}

	function render(now: number): void {
		resolveInk(now, false);
		clearGrid(grid);
		let waving = false;
		if (wave.on) {
			if (wave.start < 0) wave.start = now;
			const p = Math.min(1, Math.max(0, (now - wave.start) / WAVE_MS));
			if (p >= 1) wave.on = false;
			else {
				waving = true;
				painter(t, grid, wave.from);
				clearGrid(nextGrid);
				painter(t, nextGrid, night);
				composeWave(grid, nextGrid, side, wave.ox, wave.oy, easeInOutCubic(p) * wave.cover);
			}
		}
		if (!waving) painter(t, grid, night);
		pixelHalos(grid);
		paintGrid(c2d, grid, lens, {
			cell,
			dot,
			dpr,
			ink,
			night: waving ? wave.from : night,
			side: waving ? side : null,
			sideNight: night,
			width: canvas.width,
			height: canvas.height,
		});
		if (onFrame) {
			frame.cols = grid.cols;
			frame.rows = grid.rows;
			frame.width = canvas.width;
			frame.height = canvas.height;
			frame.pitch = cell * dpr;
			frame.size = Math.max(1, Math.round(dot * dpr));
			frame.cellCss = cell;
			frame.dpr = dpr;
			try {
				onFrame(frame);
			} catch {
				onFrame = null;
			}
		}
	}

	function tick(now: number): void {
		raf = 0;
		if (destroyed) return;
		if (!awake()) {
			last = 0;
			return;
		}
		const dt = last ? Math.min(64, Math.max(0, now - last)) : 16.667;
		last = now;
		if (readDpr() !== deviceDpr) layout();
		if (animating()) t += dt;
		lensMoving = stepLens(lens, dt, reduced());
		render(now);
		dirty = false;
		schedule();
	}

	function wake(): void {
		dirty = true;
		schedule();
	}

	// --- pointer -------------------------------------------------------------

	function aim(e: PointerEvent): void {
		if (!lensOn) return;
		const b = canvas.getBoundingClientRect();
		if (!(b.width > 0 && b.height > 0)) return;
		const sx = cssW > 0 ? cssW / b.width : 1;
		const sy = cssH > 0 ? cssH / b.height : 1;
		lens.tx = ((e.clientX - b.left) * sx) / cell;
		lens.ty = ((e.clientY - b.top) * sy) / cell;
		if (lens.r < 0.5) {
			// a closed lens opens where the pointer is instead of flying in
			lens.x = lens.tx;
			lens.y = lens.ty;
		}
		lens.tr = lensRadius;
		lensMoving = true;
		wake();
	}
	function close(): void {
		lens.tr = 0;
		lensMoving = true;
		wake();
	}
	const onMove = (e: PointerEvent) => aim(e);
	const onUp = (e: PointerEvent) => {
		if (e.pointerType === "touch") close();
	};
	const onLeave = () => close();
	host.addEventListener("pointermove", onMove);
	host.addEventListener("pointerdown", onMove);
	host.addEventListener("pointerup", onUp);
	host.addEventListener("pointerleave", onLeave);
	host.addEventListener("pointercancel", onLeave);

	// --- observers -----------------------------------------------------------

	let ro: ResizeObserver | null = null;
	if (typeof ResizeObserver !== "undefined") {
		ro = new ResizeObserver(() => {
			const w = host.clientWidth || 0;
			const h = host.clientHeight || 0;
			if (w === cssW && h === cssH && readDpr() === deviceDpr) return;
			layout();
			schedule();
		});
		ro.observe(host);
	}
	let io: IntersectionObserver | null = null;
	if (typeof IntersectionObserver !== "undefined") {
		io = new IntersectionObserver(
			(entries) => {
				const entry = entries[entries.length - 1];
				if (!entry) return;
				inView = entry.isIntersecting;
				if (inView) schedule();
				else clearInkPoll();
			},
			{ rootMargin: "128px" }
		);
		io.observe(host);
	}
	const onVisibility = () => {
		if (!docHidden()) schedule();
		else clearInkPoll();
	};
	if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisibility);
	const onMq = (e: MediaQueryListEvent) => {
		mqReduced = e.matches;
		wake();
	};
	mq?.addEventListener?.("change", onMq);

	// A theme switch on <html> (class, style, data-theme) or in the OS repaints
	// a sleeping engine whose ink is `currentColor`.
	let themeMo: MutationObserver | null = null;
	if (typeof MutationObserver !== "undefined" && typeof document !== "undefined") {
		try {
			themeMo = new MutationObserver(() => refreshInk());
			themeMo.observe(document.documentElement, {
				attributes: true,
				attributeFilter: ["class", "style", "data-theme"],
			});
		} catch {
			themeMo = null;
		}
	}
	let schemeMq: MediaQueryList | null = null;
	const onScheme = () => refreshInk();
	if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
		try {
			schemeMq = window.matchMedia("(prefers-color-scheme: dark)");
			schemeMq.addEventListener?.("change", onScheme);
		} catch {
			schemeMq = null;
		}
	}
	// A DPR change (zoom, another screen) fires no resize: relayout on it.
	let dprMq: MediaQueryList | null = null;
	const onDpr = () => {
		if (destroyed) return;
		layout();
		watchDpr();
		wake();
	};
	function watchDpr(): void {
		dprMq?.removeEventListener?.("change", onDpr);
		dprMq = null;
		if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
		const raw = window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
		try {
			dprMq = window.matchMedia(`(resolution: ${raw}dppx)`);
			dprMq.addEventListener?.("change", onDpr);
		} catch {
			dprMq = null;
		}
	}
	watchDpr();

	resolveInk(0, true);
	layout();
	schedule();

	return {
		setOptions(next) {
			if (destroyed) return;
			let relayout = false;
			if (next.painter !== undefined && next.painter !== painter) painter = next.painter;
			if (next.wave !== undefined) waveOn = !!next.wave;
			if (next.night !== undefined && !!next.night !== night) {
				const to = !!next.night;
				// A change mid-wave lands the running one: the new wave starts from its target.
				wave.on = false;
				if (waveOn && !reduced() && grid.cols * grid.rows > 0) startWave(night, to);
				night = to;
			}
			if (next.cell !== undefined && next.cell !== cellOpt) {
				cellOpt = next.cell;
				relayout = true;
			}
			if (next.dot !== undefined && next.dot !== dotOpt) {
				dotOpt = next.dot;
				relayout = true;
			}
			if (next.lens !== undefined) {
				lensOn = !!next.lens;
				if (!lensOn) lens.tr = 0;
			}
			if (next.lensRadius !== undefined) {
				lensRadius = normalizeLensRadius(next.lensRadius);
				if (lens.tr > 0) lens.tr = lensRadius;
			}
			if (next.ink !== undefined) {
				inkOpt = next.ink;
				resolveInk(0, true);
				if (!inkFollowsHost()) clearInkPoll();
			}
			if (next.paused !== undefined) paused = !!next.paused;
			if (next.reducedMotion !== undefined) rmOverride = next.reducedMotion;
			if ("onFrame" in next && next.onFrame !== undefined) onFrame = next.onFrame;
			if (relayout) layout();
			wake();
		},
		resize() {
			if (destroyed) return;
			layout();
			schedule();
		},
		destroy() {
			if (destroyed) return;
			destroyed = true;
			if (raf && typeof cancelAnimationFrame === "function") cancelAnimationFrame(raf);
			raf = 0;
			host.removeEventListener("pointermove", onMove);
			host.removeEventListener("pointerdown", onMove);
			host.removeEventListener("pointerup", onUp);
			host.removeEventListener("pointerleave", onLeave);
			host.removeEventListener("pointercancel", onLeave);
			ro?.disconnect();
			io?.disconnect();
			if (typeof document !== "undefined")
				document.removeEventListener("visibilitychange", onVisibility);
			mq?.removeEventListener?.("change", onMq);
			themeMo?.disconnect();
			schemeMq?.removeEventListener?.("change", onScheme);
			dprMq?.removeEventListener?.("change", onDpr);
			dprMq = null;
			clearInkPoll();
			onFrame = null;
		},
	};
}
