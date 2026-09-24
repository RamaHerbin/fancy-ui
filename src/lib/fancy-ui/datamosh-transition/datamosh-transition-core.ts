/**
 * DatamoshTransition core — pure math, no DOM.
 *
 * The look: flat blocks of saturated colour in a FIXED column grid, each column
 * a stack of tiles falling along one sigmoid curve — slivers at the top and
 * bottom, one fat tile snapping open through the middle. Nothing ever moves
 * horizontally; only the vertical tiling animates.
 *
 * On top of that sits the transition itself: every column owns a covered band
 * [top, bot] (0..1 of the height). Cover drops the band's bottom edge like a
 * curtain, reveal lets its top edge fall away, columns staggered right to left.
 */

// --- defaults ------------------------------------------------------------------

export const DEFAULT_COLORS = [
	"#ffffff",
	"#3566ff",
	"#ffcf00",
	"#192aff",
	"#d62036",
	"#282142",
	"#ec4978",
	"#ff9900",
	"#14101f",
	"#00dd33",
	"#00ef82",
] as const;

/** Column edges sit at W·(i/N)^power: narrow left, wide right — reads as receding perspective. */
export const DEFAULT_COLUMNS = 11;
export const DEFAULT_POWER = 1.65;
/** Odd so exactly one tile sits dead centre and takes the whole bulge. */
export const DEFAULT_TILES = 15;
/** Seconds per tile step at speed 1. */
export const CYCLE = 0.2;
/** Seconds between neighbouring columns starting to fall (right column first). */
export const FALL_STAGGER = 0.006;
/** Sigmoid exponent — steepness at the centre is tile height. */
export const STRETCH = 8.5;
/** Exponential arrival rate inside a tile step (the "spring"). */
export const SPRING_K = 1.6;
/** Each tile overhangs the one below by this fraction of the height. */
export const BLEED = 0.012;
/** Phase offset per column, in tiles — the zig-zag. Negative: stacks ride higher to the right. */
export const COL_PHASE = -0.4;
/** Slope of the curve past both ends; clamping would pile off-screen tiles onto y = 0. */
export const TAIL_SLOPE = 0.05;
/** Length of the cyclic colour strip every column reads. */
export const STRIP_LENGTH = 61;

// --- randomness ----------------------------------------------------------------

/** Small, fast, seedable PRNG (32-bit state). Same seed → same sequence. */
export function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

// --- palette -------------------------------------------------------------------

/** Relative luminance of a hex (#rgb / #rrggbb) or rgb() colour; null when unparseable. */
export function luminance(color: string): number | null {
	const s = color.trim().toLowerCase();
	let rgb: number[] | null = null;
	const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
	if (hex) {
		const h = hex[1]!;
		const full =
			h.length === 3
				? h
						.split("")
						.map((c) => c + c)
						.join("")
				: h;
		rgb = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
	} else {
		const m = s.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/);
		if (m) rgb = [Number(m[1]), Number(m[2]), Number(m[3])];
	}
	if (!rgb) return null;
	const [r, g, b] = rgb.map((v) => {
		const c = Math.min(255, v) / 255;
		return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	}) as [number, number, number];
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export interface PaletteRoles {
	/** The lightest colour — recurs most often (~a quarter of the strip). */
	light: number;
	/** The darkest one or two colours — the other contrast anchor. */
	darks: number[];
	/** Everything else. */
	hues: number[];
}

/** Split a palette into contrast anchors and mid-tone hues by luminance. */
export function paletteRoles(colors: readonly string[]): PaletteRoles {
	const ranked = colors
		.map((c, i) => ({ i, l: luminance(c) ?? 0.5 }))
		.sort((a, b) => a.l - b.l || a.i - b.i);
	const light = ranked[ranked.length - 1]!.i;
	const darkCount = colors.length >= 5 ? 2 : 1;
	const darks = ranked.slice(0, darkCount).map((r) => r.i);
	const hues = ranked.slice(darkCount, -1).map((r) => r.i);
	return { light, darks, hues };
}

function pickDifferent(from: number, avoid: number[], len: number): number {
	for (let i = 1; i <= len; i++) {
		const c = (from + i) % len;
		if (!avoid.includes(c)) return c;
	}
	return from;
}

/**
 * The cyclic colour strip, as palette indices. Light and dark anchors recur
 * often on purpose: a fixed palette stride walks past them and leaves flat
 * mid-tone corduroy. No two neighbours repeat, including across the wrap.
 */
export function buildStrip(seed: number, colors: readonly string[], len = STRIP_LENGTH): number[] {
	const n = colors.length;
	if (n < 2) return Array.from({ length: len }, () => 0);
	const { light, darks, hues } = paletteRoles(colors);
	const pool = hues.length ? hues : darks;
	const rand = mulberry32(seed);
	const strip: number[] = [];
	let lastHue = -1;

	for (let k = 0; k < len; k++) {
		const r = rand();
		let next: number;
		if (r < 0.26) {
			next = light;
		} else if (r < 0.42) {
			next = darks[Math.floor(rand() * darks.length)]!;
		} else {
			let h = pool[Math.floor(rand() * pool.length)]!;
			if (h === lastHue && pool.length > 1) h = pool[(pool.indexOf(h) + 1) % pool.length]!;
			lastHue = h;
			next = h;
		}
		if (k > 0 && next === strip[k - 1]) next = pickDifferent(next, [strip[k - 1]!], n);
		strip.push(next);
	}

	if (len > 2 && strip[len - 1] === strip[0]) {
		strip[len - 1] = pickDifferent(strip[len - 1]!, [strip[len - 2]!, strip[0]!], n);
	}
	return strip;
}

/** Colour for a tile, keyed by its IDENTITY (never its on-screen slot) — colours stay put. */
export function stripIndex(strip: readonly number[], id: number, column: number): number {
	const len = strip.length;
	const s = id - column;
	return strip[((s % len) + len) % len]!;
}

// --- geometry ------------------------------------------------------------------

/** Column edges in device px: W·(i/N)^power, rounded. Length = columns + 1. */
export function columnEdges(width: number, columns: number, power: number): number[] {
	const edges: number[] = [];
	for (let i = 0; i <= columns; i++) {
		edges.push(Math.round(width * Math.pow(i / columns, power)));
	}
	return edges;
}

/** Force a usable odd tile count (≥ 3). */
export function oddTiles(tiles: number): number {
	const t = Math.max(3, Math.round(Number.isFinite(tiles) ? tiles : DEFAULT_TILES));
	return t % 2 === 0 ? t + 1 : t;
}

/**
 * Where tile boundary `k` sits, 0..1 of the height. Sigmoid across [0, tiles],
 * extended LINEARLY (shallow slope) past both ends rather than clamped.
 */
export function tileEdge(k: number, tiles: number, stretch = STRETCH): number {
	const u = k / tiles;
	if (u < 0) return u * TAIL_SLOPE;
	if (u > 1) return 1 + (u - 1) * TAIL_SLOPE;
	const a = Math.pow(u, stretch);
	return a / (a + Math.pow(1 - u, stretch));
}

const SPRING_NORM = 1 - Math.exp(-SPRING_K);

/**
 * Re-time the fraction of one tile step: exponential arrival mirrored at the
 * halfway point. Rushes in, hangs at the centre (fattest), releases. Monotonic,
 * exact at 0 and 1, so the stack never drifts off schedule.
 */
export function springStep(p: number): number {
	const half = (t: number) => (1 - Math.exp(-SPRING_K * t)) / SPRING_NORM;
	return p < 0.5 ? 0.5 * half(2 * p) : 1 - 0.5 * half(2 * (1 - p));
}

/**
 * Unbounded phase of column `i` at `elapsed` seconds. Never wrapped: tile
 * identity is derived from it, so a wrap would teleport every boundary.
 */
export function columnFlow(elapsed: number, column: number, columns: number, speed = 1): number {
	const delay = (columns - 1 - column) * FALL_STAGGER;
	const t = elapsed - delay;
	const raw = t <= 0 ? 0 : (t * speed) / CYCLE;
	const linear = raw + column * COL_PHASE;
	const step = Math.floor(linear);
	return step + springStep(linear - step);
}

export interface TileRect {
	id: number;
	/** Device px, unclamped. */
	top: number;
	/** Device px, bleed included, unclamped. */
	bot: number;
}

/**
 * The tiles of one column at `flow`, ordered BOTTOM-UP (paint order): each
 * tile overhangs the one below it by `bleed` px, so painting upward laps the
 * overhang over the lower tile instead of hiding it under it.
 */
export function columnTiles(
	flow: number,
	tiles: number,
	height: number,
	bleed: number
): TileRect[] {
	const out: TileRect[] = [];
	const base = -Math.floor(flow);
	for (let n = tiles + 2; n >= -2; n--) {
		const id = base + n;
		const k = id + flow;
		const top = Math.round(tileEdge(k, tiles) * height);
		const bot = Math.round(tileEdge(k + 1, tiles) * height) + bleed;
		if (bot <= top) continue;
		out.push({ id, top, bot });
	}
	return out;
}

// --- coverage ------------------------------------------------------------------

export type Direction = "cover" | "reveal";

export interface Coverage {
	/** Covered band per column, linear 0..1 (eased only when drawn). */
	top: Float32Array;
	bot: Float32Array;
}

export function createCoverage(columns: number, covered = false): Coverage {
	const top = new Float32Array(columns);
	const bot = new Float32Array(columns);
	if (covered) bot.fill(1);
	return { top, bot };
}

/** Order in which the columns move. */
export type DatamoshSweep = "right" | "left" | "center" | "edges" | "random";

/**
 * Delay before each column moves, in seconds. `right` starts at the rightmost
 * column, `center` fans out from the middle, `edges` closes in from both
 * sides, `random` is a seeded shuffle.
 */
export function columnDelays(
	columns: number,
	sweep: DatamoshSweep,
	stagger: number,
	seed = 1
): number[] {
	const mid = (columns - 1) / 2;
	const rank = (i: number): number => {
		switch (sweep) {
			case "left":
				return i;
			case "center":
				return Math.abs(i - mid);
			case "edges":
				return mid - Math.abs(i - mid);
			case "random":
				return 0;
			default:
				return columns - 1 - i;
		}
	};
	if (sweep === "random") {
		const order = Array.from({ length: columns }, (_, i) => i);
		const rand = mulberry32(seed ^ 0x5eed);
		for (let i = order.length - 1; i > 0; i--) {
			const j = Math.floor(rand() * (i + 1));
			[order[i], order[j]] = [order[j]!, order[i]!];
		}
		const delays = new Array<number>(columns);
		order.forEach((col, k) => (delays[col] = k * stagger));
		return delays;
	}
	return Array.from({ length: columns }, (_, i) => rank(i) * stagger);
}

/**
 * Advance every column one step toward `direction`. Cover drops the band's
 * bottom edge to 1 (and pulls a half-fallen top back up); reveal lets the top
 * edge fall onto the bottom one. Monotonic per column, so an interruption just
 * reverses from wherever each column is. Returns true once every column is done.
 */
export function stepCoverage(
	cov: Coverage,
	direction: Direction,
	phaseTime: number,
	dt: number,
	duration: number,
	delays: ArrayLike<number>
): boolean {
	const n = cov.top.length;
	const rate = duration > 0 ? dt / duration : Infinity;
	let done = true;
	for (let i = 0; i < n; i++) {
		const started = phaseTime >= (delays[i] ?? 0);
		if (direction === "cover") {
			// An emptied column restarts from the top as a fresh curtain.
			if (cov.bot[i]! - cov.top[i]! <= 1e-6 && cov.bot[i]! < 1) {
				cov.top[i] = 0;
				cov.bot[i] = 0;
			}
			if (started) {
				cov.bot[i] = Math.min(1, cov.bot[i]! + rate);
				cov.top[i] = Math.max(0, cov.top[i]! - rate);
			}
			if (cov.bot[i]! < 1 || cov.top[i]! > 0) done = false;
		} else {
			if (started) cov.top[i] = Math.min(cov.bot[i]!, cov.top[i]! + rate);
			if (cov.top[i]! < cov.bot[i]!) done = false;
		}
	}
	return done;
}

/** Snap every column to the end of `direction`. */
export function settleCoverage(cov: Coverage, direction: Direction) {
	if (direction === "cover") {
		cov.top.fill(0);
		cov.bot.fill(1);
	} else {
		cov.top.fill(0);
		cov.bot.fill(0);
	}
}

/** Ease for a band edge: cubic in-out, exact at 0 and 1. */
export function easeEdge(a: number): number {
	const x = Math.min(1, Math.max(0, a));
	return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

// --- effects ---------------------------------------------------------------------

/**
 * Shape of the covered band. `curtain` drops from the top and falls away,
 * `rise` climbs from the bottom and lifts off, `split` opens from the centre
 * line and squeezes shut onto it, `interlace` alternates curtain and rise
 * column by column. Everything stays vertical.
 */
export type DatamoshEffect = "curtain" | "rise" | "split" | "interlace";

export interface Band {
	/** 0..1 of the height. */
	y0: number;
	y1: number;
	/** Draw the tile stack upside down (tiles rise instead of fall). */
	mirror: boolean;
}

/**
 * Map a column's curtain-space band `[top, bot]` (already eased) onto the
 * screen for `effect`. Curtain space is what `stepCoverage` animates; every
 * effect is a pure re-mapping of it, so interruptions behave the same.
 */
export function columnBand(effect: DatamoshEffect, column: number, top: number, bot: number): Band {
	const rise = effect === "rise" || (effect === "interlace" && column % 2 === 1);
	if (effect === "split") {
		const half = Math.max(0, bot - top) / 2;
		return { y0: 0.5 - half, y1: 0.5 + half, mirror: false };
	}
	if (rise) return { y0: 1 - bot, y1: 1 - top, mirror: true };
	return { y0: top, y1: bot, mirror: false };
}

// --- palettes --------------------------------------------------------------------

/** Ready-made palettes. Each keeps one light anchor and a couple of near-blacks. */
export const DATAMOSH_PALETTES = {
	broadcast: DEFAULT_COLORS,
	thermal: [
		"#fff4d6",
		"#ffd23f",
		"#ff9f1c",
		"#ff5a1f",
		"#e0282e",
		"#b0125b",
		"#6a0f63",
		"#2a0a3d",
		"#0d0614",
	],
	sunset: [
		"#fff6d8",
		"#fbc56b",
		"#f59a3a",
		"#e97a1d",
		"#c85a14",
		"#8a4a22",
		"#5a3b25",
		"#2d1c16",
		"#140b08",
	],
	mono: ["#ffffff", "#e5e5e5", "#b5b5b5", "#8a8a8a", "#5c5c5c", "#2e2e2e", "#141414", "#050505"],
	acid: [
		"#f4ffe8",
		"#e4ff1a",
		"#00ff9c",
		"#00e0ff",
		"#3d5afe",
		"#8c3dff",
		"#ff2bd6",
		"#1b0b36",
		"#070707",
	],
} as const satisfies Record<string, readonly string[]>;

export type DatamoshPaletteName = keyof typeof DATAMOSH_PALETTES;

/** Resolve a palette name or colour list; falls back to the default for anything unusable. */
export function resolvePalette(
	colors: readonly string[] | DatamoshPaletteName | undefined
): string[] {
	if (typeof colors === "string") return [...(DATAMOSH_PALETTES[colors] ?? DEFAULT_COLORS)];
	return colors && colors.length >= 2 ? [...colors] : [...DEFAULT_COLORS];
}

// --- picture source --------------------------------------------------------------

/** Largest brightness gain the `boost` auto-levels may apply. */
export const MAX_GAIN = 1.6;

/** Share of the picture's height the slots sample from, centred. */
export const SOURCE_SPAN = 0.6;

/**
 * Height (0..1) a slot samples the picture at: spread linearly over the middle
 * `SOURCE_SPAN` of the picture. Not along the fall's sigmoid, which packs
 * almost every slot against the edges, and not over the full height, where
 * frames and borders (the darkest, dullest parts of most pictures) sit.
 */
export function sourceSlotY(slot: number, tiles: number): number {
	return 0.5 + ((slot + 0.5) / tiles - 0.5) * SOURCE_SPAN;
}

/**
 * Which rest slot a tile's colour is sampled from. Keyed by IDENTITY, like the
 * colour strip: a tile keeps its piece of the picture as it falls, so the
 * image gets dragged down in chunks instead of sliding under the grid.
 */
export function sourceSlot(id: number, column: number, tiles: number): number {
	const s = id - column;
	return ((s % tiles) + tiles) % tiles;
}

/** Source rect that fits an image over a box like `object-fit: cover`. */
export function coverFit(
	imgW: number,
	imgH: number,
	boxW: number,
	boxH: number
): { sx: number; sy: number; sw: number; sh: number } {
	if (imgW <= 0 || imgH <= 0 || boxW <= 0 || boxH <= 0) return { sx: 0, sy: 0, sw: imgW, sh: imgH };
	const scale = Math.max(boxW / imgW, boxH / imgH);
	const sw = boxW / scale;
	const sh = boxH / scale;
	return { sx: (imgW - sw) / 2, sy: (imgH - sh) / 2, sw, sh };
}

/**
 * Colour table `[column][slot]` sampled from an RGBA buffer that already maps
 * onto the overlay box. Each cell averages a 3×3 neighbourhood at the column's
 * centre and the slot's height. `edges` are column edges normalised to 0..1.
 *
 * With `boost` (default), the table is auto-levelled (darkest cell → black,
 * brightest → white) and saturated, so a moody picture still decodes into the
 * flat, saturated blocks the effect is about.
 */
export function sampleSource(
	pixels: ArrayLike<number>,
	pw: number,
	ph: number,
	edges: readonly number[],
	tiles: number,
	boost = true
): string[][] {
	const at = (x: number, y: number) => {
		const cx = Math.min(pw - 1, Math.max(0, x));
		const cy = Math.min(ph - 1, Math.max(0, y));
		return (cy * pw + cx) * 4;
	};
	const cells: [number, number, number][][] = [];
	let lo = Infinity;
	let hi = -Infinity;
	for (let i = 0; i + 1 < edges.length; i++) {
		const x = Math.round(((edges[i]! + edges[i + 1]!) / 2) * (pw - 1));
		const row: [number, number, number][] = [];
		for (let s = 0; s < tiles; s++) {
			const y = Math.round(sourceSlotY(s, tiles) * (ph - 1));
			let r = 0;
			let g = 0;
			let b = 0;
			for (let dy = -1; dy <= 1; dy++) {
				for (let dx = -1; dx <= 1; dx++) {
					const k = at(x + dx, y + dy);
					r += pixels[k]!;
					g += pixels[k + 1]!;
					b += pixels[k + 2]!;
				}
			}
			const cell: [number, number, number] = [r / 9, g / 9, b / 9];
			const l = 0.2126 * cell[0] + 0.7152 * cell[1] + 0.0722 * cell[2];
			lo = Math.min(lo, l);
			hi = Math.max(hi, l);
			row.push(cell);
		}
		cells.push(row);
	}

	const span = hi - lo;
	// Gain capped: a dark, low-contrast picture (a dusk scene) would otherwise be
	// blown out into one flat neon colour.
	const level = boost && span > 8 ? Math.min(MAX_GAIN, 255 / (hi - lo * 0.5)) : 1;
	// Lift the floor only halfway, so shadows stay dark without crushing to black.
	const offset = boost && span > 8 ? lo * 0.5 : 0;
	const saturation = boost ? 1.35 : 1;
	const clamp = (v: number) => Math.round(Math.min(255, Math.max(0, v)));

	return cells.map((row) =>
		row.map(([r, g, b]) => {
			let [nr, ng, nb] = [(r - offset) * level, (g - offset) * level, (b - offset) * level];
			const l = 0.2126 * nr + 0.7152 * ng + 0.0722 * nb;
			nr = l + (nr - l) * saturation;
			ng = l + (ng - l) * saturation;
			nb = l + (nb - l) * saturation;
			return `rgb(${clamp(nr)}, ${clamp(ng)}, ${clamp(nb)})`;
		})
	);
}
