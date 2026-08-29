/**
 * PulseBeam — pure data and string builders.
 *
 * Everything here is DOM-free so it can be unit-tested without jsdom and
 * evaluated safely on the server. The component reads these tables to build
 * the three layer backgrounds and the oscillator set that the shared loop
 * (`pulse-beam-loop.ts`) drives through CSS custom properties.
 *
 * Custom property namespace: `--pb-*`. Every `var()` carries a fallback so the
 * static (reduced-motion, or pre-first-frame) render is already correct.
 */

export type PulseBeamVariant = "inner" | "outside";
export type PulseBeamPalette = "colorful" | "mono" | "ocean" | "sunset";
export type PulseBeamTone = "dark" | "light";

type Quadrant = "tl" | "tr" | "bl" | "br";
type Region = 1 | 2 | 3;
type Rgb = readonly [number, number, number];

/** One animated custom property: a cosine breathing between `a` and `b`. */
export interface Oscillator {
	prop: string;
	a: number;
	b: number;
	/** seconds */
	period: number;
	/** seconds */
	delay: number;
	unit: "" | "px";
}

// ---------------------------------------------------------------------------
// Palettes — nine colour slots. Slot order is the anchor order below.
// ---------------------------------------------------------------------------

export const PALETTES: Record<PulseBeamPalette, readonly Rgb[]> = {
	colorful: [
		[255, 50, 100],
		[40, 140, 255],
		[50, 200, 80],
		[30, 185, 170],
		[100, 70, 255],
		[40, 140, 255],
		[255, 120, 40],
		[240, 50, 180],
		[180, 40, 240],
	],
	mono: [
		[180, 180, 180],
		[140, 140, 140],
		[160, 160, 160],
		[130, 130, 130],
		[170, 170, 170],
		[150, 150, 150],
		[190, 190, 190],
		[145, 145, 145],
		[165, 165, 165],
	],
	ocean: [
		[100, 80, 220],
		[60, 120, 255],
		[80, 100, 200],
		[50, 140, 220],
		[120, 80, 255],
		[70, 130, 255],
		[140, 100, 240],
		[90, 110, 230],
		[130, 70, 255],
	],
	sunset: [
		[255, 80, 50],
		[255, 160, 40],
		[255, 120, 60],
		[255, 200, 50],
		[255, 100, 80],
		[255, 180, 60],
		[255, 60, 60],
		[255, 140, 50],
		[255, 90, 70],
	],
};

/**
 * Where each slot sits on the box edge, which corner group drives its alpha,
 * and which oscillator region (1–3) drives its shape and drift.
 */
interface Slot {
	x: string;
	y: string;
	quad: Quadrant;
	region: Region;
}

const SLOTS: readonly Slot[] = [
	{ x: "33%", y: "-7.4%", quad: "tl", region: 1 },
	{ x: "12%", y: "-5%", quad: "tl", region: 2 },
	{ x: "2.1%", y: "68.3%", quad: "bl", region: 3 },
	{ x: "2.1%", y: "68.3%", quad: "bl", region: 1 },
	{ x: "74.4%", y: "100%", quad: "br", region: 2 },
	{ x: "55%", y: "100%", quad: "br", region: 3 },
	{ x: "93.9%", y: "0%", quad: "tr", region: 1 },
	{ x: "100%", y: "27.1%", quad: "tr", region: 2 },
	{ x: "100%", y: "27.1%", quad: "tr", region: 3 },
];

/** Animated blob: slot index + base ellipse size (px). */
interface Blob {
	slot: number;
	w: number;
	h: number;
	/** Optional anchor override (outside variant hugs the edge more tightly). */
	x?: string;
	y?: string;
}

/** Static blob (bloom layer): no oscillators, fixed alpha. */
type StaticBlob = Blob;

// Inner variant ---------------------------------------------------------------

const INNER_STROKE: readonly Blob[] = [
	{ slot: 0, w: 70, h: 40 },
	{ slot: 1, w: 60, h: 35 },
	{ slot: 2, w: 40, h: 70 },
	{ slot: 3, w: 20, h: 35 },
	{ slot: 4, w: 180, h: 32 },
	{ slot: 5, w: 85, h: 26 },
	{ slot: 6, w: 74, h: 32 },
	{ slot: 7, w: 26, h: 42 },
	{ slot: 8, w: 52, h: 48 },
];

const INNER_GLOW: readonly Blob[] = [
	{ slot: 0, w: 65, h: 35 },
	{ slot: 1, w: 55, h: 30 },
	{ slot: 2, w: 35, h: 65 },
	{ slot: 3, w: 15, h: 30 },
	{ slot: 4, w: 173, h: 28 },
	{ slot: 5, w: 80, h: 22 },
	{ slot: 6, w: 69, h: 28 },
	{ slot: 7, w: 22, h: 38 },
	{ slot: 8, w: 47, h: 44 },
];

const INNER_BLOOM: readonly StaticBlob[] = [
	{ slot: 0, w: 84, h: 48 },
	{ slot: 1, w: 72, h: 42 },
	{ slot: 2, w: 48, h: 84 },
	{ slot: 4, w: 216, h: 38 },
	{ slot: 5, w: 102, h: 31 },
	{ slot: 6, w: 89, h: 38 },
	{ slot: 8, w: 62, h: 58 },
];

// Outside variant -------------------------------------------------------------

const OUTSIDE_STROKE: readonly Blob[] = [
	{ slot: 0, w: 80, h: 19, x: "27%", y: "0%" },
	{ slot: 6, w: 74, h: 11, x: "73%", y: "-1%" },
	{ slot: 7, w: 15, h: 44, x: "100%", y: "33%" },
	{ slot: 8, w: 19, h: 38, x: "101%", y: "72%" },
	{ slot: 4, w: 84, h: 13, x: "67%", y: "100%" },
	{ slot: 1, w: 60, h: 21, x: "24%", y: "101%" },
	{ slot: 2, w: 17, h: 40, x: "0%", y: "60%" },
	{ slot: 3, w: 13, h: 32, x: "-1%", y: "28%" },
];

const OUTSIDE_GLOW: readonly Blob[] = OUTSIDE_STROKE;

const OUTSIDE_BLOOM: readonly StaticBlob[] = [
	{ slot: 0, w: 110, h: 30, x: "27%", y: "3%" },
	{ slot: 6, w: 100, h: 20, x: "73%", y: "1%" },
	{ slot: 7, w: 26, h: 62, x: "100%", y: "33%" },
	{ slot: 8, w: 30, h: 56, x: "101%", y: "72%" },
	{ slot: 4, w: 120, h: 22, x: "67%", y: "99%" },
	{ slot: 1, w: 88, h: 32, x: "24%", y: "99%" },
	{ slot: 2, w: 28, h: 58, x: "0%", y: "60%" },
];

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

export interface LayerPreset {
	stroke: number;
	glow: number;
	bloom: number;
	brightness: number;
	saturation: number;
	/** px — outside variant only (inner glow is masked, not blurred) */
	glowBlur: number;
	/** px */
	bloomBlur: number;
}

export const LAYER_PRESETS: Record<PulseBeamVariant, Record<PulseBeamTone, LayerPreset>> = {
	inner: {
		dark: {
			stroke: 1.54,
			glow: 0.44,
			bloom: 0.66,
			brightness: 0.75,
			saturation: 1.2,
			glowBlur: 0,
			bloomBlur: 8,
		},
		light: {
			stroke: 0.32,
			glow: 0.4,
			bloom: 0.8,
			brightness: 1.3,
			saturation: 0.75,
			glowBlur: 0,
			bloomBlur: 8,
		},
	},
	outside: {
		dark: {
			stroke: 0.94,
			glow: 0.34,
			bloom: 0.3,
			brightness: 1.9,
			saturation: 1.2,
			glowBlur: 3,
			bloomBlur: 22.5,
		},
		light: {
			stroke: 1.96,
			glow: 1.04,
			bloom: 0.42,
			brightness: 1.7,
			saturation: 0.6,
			glowBlur: 6,
			bloomBlur: 15,
		},
	},
};

export interface MotionPreset {
	/** shape scale amplitude (±) */
	sp: number;
	/** drift amplitude in px (±) */
	dr: number;
	/** corner alpha dip: alphas breathe between 1 - op and 1 */
	op: number;
	/** global height scale amplitude (±) */
	gh: number;
	/** base period for drift + alpha (s) */
	bs: number;
	/** base period for shape (s) */
	ss: number;
	/** period for global height (s) */
	ghs: number;
	/** full hue rotation period (s) */
	huePeriod: number;
}

const MOTION: Record<PulseBeamVariant, Record<PulseBeamTone, MotionPreset>> = {
	inner: {
		dark: { sp: 0.28, dr: 33, op: 0.48, gh: 0.34, bs: 1.9, ss: 2.6, ghs: 2.4, huePeriod: 16 },
		light: { sp: 0.28, dr: 40, op: 0.45, gh: 0.22, bs: 2.6, ss: 4.6, ghs: 5.5, huePeriod: 16 },
	},
	outside: {
		dark: { sp: 0.28, dr: 14, op: 0.46, gh: 0.16, bs: 2.3, ss: 6.4, ghs: 2.4, huePeriod: 14 },
		light: { sp: 0.36, dr: 19, op: 0, gh: 0.58, bs: 3.7, ss: 4.6, ghs: 3.8, huePeriod: 14 },
	},
};

/** Motion preset with `speed` applied (higher = faster breathing; hue period untouched). */
export function motionPreset(
	variant: PulseBeamVariant,
	tone: PulseBeamTone,
	speed = 1
): MotionPreset {
	const base = MOTION[variant][tone];
	const s = Number.isFinite(speed) && speed > 0 ? speed : 1;
	return { ...base, bs: base.bs / s, ss: base.ss / s, ghs: base.ghs / s };
}

// ---------------------------------------------------------------------------
// Oscillators
// ---------------------------------------------------------------------------

/** Cosine breathing: `a` at t = delay, `b` half a period later, back to `a`. */
export function oscillate(o: Oscillator, t: number): number {
	const phase = (t - o.delay) / o.period;
	const k = (1 - Math.cos(Math.PI * 2 * phase)) / 2;
	return o.a + (o.b - o.a) * k;
}

/** The 17 animated properties (3 regions × 4, global height, 4 corner alphas). */
export function buildOscillators(m: MotionPreset): Oscillator[] {
	const { sp, dr, op, gh, bs, ss, ghs } = m;
	const n = (prop: string, a: number, b: number, period: number, delay = 0): Oscillator => ({
		prop,
		a,
		b,
		period,
		delay,
		unit: "",
	});
	const px = (prop: string, a: number, b: number, period: number): Oscillator => ({
		prop,
		a,
		b,
		period,
		delay: 0,
		unit: "px",
	});
	return [
		n("--pb-bw1", 1 - sp, 1 + sp * 1.1, ss * 0.9),
		n("--pb-bh1", 1 + sp * 0.9, 1 - sp * 0.85, ss * 1.26),
		px("--pb-bx1", -dr, dr * 0.9, bs * 1.6),
		px("--pb-by1", dr * 0.55, -dr * 0.7, bs * 1.6),
		n("--pb-bw2", 1 + sp, 1 - sp * 0.85, ss * 1.1),
		n("--pb-bh2", 1 - sp * 0.8, 1 + sp * 1.05, ss * 0.81),
		px("--pb-bx2", dr * 0.8, -dr * 0.9, bs * 1.88),
		px("--pb-by2", -dr, dr * 0.65, bs * 1.88),
		n("--pb-bw3", 1 - sp * 0.6, 1 + sp * 1.15, ss * 0.98),
		n("--pb-bh3", 1 + sp * 0.75, 1 - sp, ss * 1.4),
		px("--pb-bx3", -dr * 0.6, dr, bs * 1.45),
		px("--pb-by3", -dr * 0.85, dr * 0.45, bs * 1.45),
		n("--pb-gh", 1 - gh, 1 + gh, ghs),
		n("--pb-op-tl", 1 - op, 1, bs),
		n("--pb-op-tr", 1 - op, 1, bs * 1.32, bs * 0.28),
		n("--pb-op-bl", 1 - op, 1, bs * 0.84, bs * 0.55),
		n("--pb-op-br", 1 - op, 1, bs * 1.58, bs * 0.83),
	];
}

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const RGB_RE = /^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/i;
const RGB_ALPHA_RE =
	/^rgba?\(\s*\d{1,3}\s*[, ]\s*\d{1,3}\s*[, ]\s*\d{1,3}\s*[,/]\s*([0-9]*\.?[0-9]+)(%?)\s*\)$/i;

/** Parse `#rgb`, `#rrggbb`, `rgb()` / `rgba()` to a triplet; anything else → null. */
export function parseRgb(input: string): Rgb | null {
	const s = input.trim();
	const hex = HEX_RE.exec(s);
	if (hex) {
		const h = hex[1]!;
		const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h;
		return [
			parseInt(full.slice(0, 2), 16),
			parseInt(full.slice(2, 4), 16),
			parseInt(full.slice(4, 6), 16),
		];
	}
	const rgb = RGB_RE.exec(s);
	if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
	return null;
}

/** Alpha carried by an `rgba()` string, 0–1; null when the colour has none. */
function parseRgbAlpha(input: string): number | null {
	const m = RGB_ALPHA_RE.exec(input.trim());
	if (!m) return null;
	const n = Number(m[1]);
	if (!Number.isFinite(n)) return null;
	return Math.min(1, Math.max(0, m[2] ? n / 100 : n));
}

/** Colour with a `var()`-driven alpha. Falls back to `color-mix()` for opaque tokens. */
function withAlpha(color: Rgb | string, alpha: string): string {
	if (typeof color !== "string") return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
	const rgb = parseRgb(color);
	if (rgb) {
		// An `rgba()` override keeps its own alpha: multiply it into the animated one
		// instead of dropping it, so a translucent colour stays translucent.
		const own = parseRgbAlpha(color);
		const a = own === null || own === 1 ? alpha : `calc(${alpha} * ${own})`;
		return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`;
	}
	return `color-mix(in srgb, ${color} calc(${alpha} * 100%), transparent)`;
}

function slotColors(palette: PulseBeamPalette, colors?: string[]): readonly (Rgb | string)[] {
	const base = PALETTES[palette];
	if (!colors || colors.length === 0) return base;
	return base.map((c, i) => {
		const override = colors[i % colors.length];
		return override && override.trim() ? override : c;
	});
}

// ---------------------------------------------------------------------------
// Layer backgrounds
// ---------------------------------------------------------------------------

export interface BackgroundOptions {
	variant: PulseBeamVariant;
	palette: PulseBeamPalette;
	colors?: string[];
	tone: PulseBeamTone;
	/** `op` from the motion preset — sets the bloom's static alpha */
	op: number;
}

export interface LayerBackgrounds {
	stroke: string;
	glow: string;
	bloom: string;
}

function animatedBlob(b: Blob, color: Rgb | string, scaled: boolean): string {
	const s = SLOTS[b.slot]!;
	const r = s.region;
	const sx = scaled ? " * var(--pb-sx, 1)" : "";
	const sy = scaled ? " * var(--pb-sy, 1)" : "";
	const w = `calc(${b.w}px * var(--pb-bw${r}, 1)${sx})`;
	const h = `calc(${b.h}px * var(--pb-bh${r}, 1) * var(--pb-gh, 1)${sy})`;
	const x = `calc(${b.x ?? s.x} + var(--pb-bx${r}, 0px))`;
	const y = `calc(${b.y ?? s.y} + var(--pb-by${r}, 0px))`;
	return `radial-gradient(ellipse ${w} ${h} at ${x} ${y}, ${withAlpha(color, `var(--pb-op-${s.quad}, 1)`)}, transparent)`;
}

function staticBlob(b: StaticBlob, color: Rgb | string, alpha: number, scaled: boolean): string {
	const s = SLOTS[b.slot]!;
	const w = scaled ? `calc(${b.w}px * var(--pb-sx, 1))` : `${b.w}px`;
	const h = scaled ? `calc(${b.h}px * var(--pb-sy, 1))` : `${b.h}px`;
	const a = +alpha.toFixed(3);
	return `radial-gradient(ellipse ${w} ${h} at ${b.x ?? s.x} ${b.y ?? s.y}, ${withAlpha(color, String(a))}, transparent)`;
}

function cornerDots(tone: PulseBeamTone): string[] {
	const rgb = tone === "dark" ? "255, 255, 255" : "0, 0, 0";
	const a = tone === "dark" ? 0.18 : 0.08;
	const corners: [string, string, Quadrant][] = [
		["0%", "0%", "tl"],
		["100%", "0%", "tr"],
		["0%", "100%", "bl"],
		["100%", "100%", "br"],
	];
	return corners.map(
		([x, y, q]) =>
			`radial-gradient(ellipse 60px 60px at ${x} ${y}, rgba(${rgb}, calc(${a} * var(--pb-op-${q}, 1))), transparent 70%)`
	);
}

/** Build the three layer `background` values for the given configuration. */
export function buildLayerBackgrounds(o: BackgroundOptions): LayerBackgrounds {
	const colors = slotColors(o.palette, o.colors);
	const outside = o.variant === "outside";
	const strokeBlobs = outside ? OUTSIDE_STROKE : INNER_STROKE;
	const glowBlobs = outside ? OUTSIDE_GLOW : INNER_GLOW;
	const bloomBlobs = outside ? OUTSIDE_BLOOM : INNER_BLOOM;
	const bloomAlpha = 1 - o.op * 0.5;

	const stroke = strokeBlobs.map((b) => animatedBlob(b, colors[b.slot]!, outside));
	const glow = glowBlobs.map((b) => animatedBlob(b, colors[b.slot]!, outside));
	if (!outside) glow.push(...cornerDots(o.tone));
	const bloom = bloomBlobs.map((b) => staticBlob(b, colors[b.slot]!, bloomAlpha, outside));

	return { stroke: stroke.join(", "), glow: glow.join(", "), bloom: bloom.join(", ") };
}
