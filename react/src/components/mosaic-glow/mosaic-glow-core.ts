/**
 * MosaicGlow core — pure math, no DOM.
 *
 * Everything the canvas loop needs that can be unit-tested without a browser:
 * a seeded PRNG, per-tile grid state, the halo falloff curve, the fps-independent
 * heat step, ambient flicker, the colour LUT and the idle drift path.
 *
 * Ported unchanged from the Svelte package's `mosaic-glow-core.ts`. The only
 * edits are the `!` assertions on typed-array, string and regex-group reads:
 * this package compiles with `noUncheckedIndexedAccess`, which widens every
 * indexed read to `| undefined`. Each one is in bounds by construction (the
 * loops are driven by the array's own length, the regex groups are guaranteed
 * by a successful match), so the assertions change no behaviour.
 */

export type Rgb = [number, number, number];

// --- randomness --------------------------------------------------------------

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

/** Mix three integers into one uint32 (order-sensitive). */
function hash3(seed: number, a: number, b: number, salt: number): number {
	let h = (seed >>> 0) ^ 0x9e3779b9;
	h = Math.imul(h ^ (a + 0x7f4a7c15), 0x85ebca6b);
	h ^= h >>> 13;
	h = Math.imul(h ^ (b + 0x165667b1), 0xc2b2ae35);
	h ^= h >>> 16;
	h = Math.imul(h ^ (salt + 0x27d4eb2f), 0x9e3779b1);
	h ^= h >>> 15;
	return h >>> 0;
}

/**
 * Deterministic random in [0, 1) for a tile, keyed by its (col, row) coordinates
 * rather than its linear index so a resize never reshuffles the field.
 */
export function tileRandom(seed: number, col: number, row: number, salt: number): number {
	return mulberry32(hash3(seed, col, row, salt))();
}

// --- grid --------------------------------------------------------------------

export interface MosaicGrid {
	cols: number;
	rows: number;
	/** Per-tile peak response to the halo, in [1 - noise, 1]. */
	weight: Float32Array;
	/** Current ambient level (LUT space, 0..ambient). */
	ambient: Float32Array;
	/** Flicker eases `ambient` toward this. */
	ambientTarget: Float32Array;
	/** Lit level driven by the halo, 0..1. */
	heat: Float32Array;
}

/** Brightest resting tile at `ambient = 1`, in LUT space (keeps them well under the halo colour). */
export const AMBIENT_CEILING = 0.4;

/** Cubic skew so most tiles sit near black and only a few read as "on". */
export function ambientLevel(u: number, ambient: number): number {
	return u * u * u * ambient * AMBIENT_CEILING;
}

export function createGrid(
	cols: number,
	rows: number,
	seed: number,
	noise: number,
	ambient: number
): MosaicGrid {
	const n = Math.max(0, cols * rows);
	const weight = new Float32Array(n);
	const amb = new Float32Array(n);
	const ambientTarget = new Float32Array(n);
	const heat = new Float32Array(n);
	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < cols; c++) {
			const i = r * cols + c;
			weight[i] = 1 - noise * tileRandom(seed, c, r, 1);
			const a = ambientLevel(tileRandom(seed, c, r, 2), ambient);
			amb[i] = a;
			ambientTarget[i] = a;
		}
	}
	return { cols, rows, weight, ambient: amb, ambientTarget, heat };
}

// --- halo --------------------------------------------------------------------

/**
 * 1 - smoothstep(d): exactly 1 at the centre, exactly 0 at the rim, zero slope
 * at both ends so there is never a visible hard ring.
 */
export function falloff(d: number): number {
	if (d <= 0) return 1;
	if (d >= 1) return 0;
	const s = 1 - d;
	return s * s * (1 + 2 * d);
}

/** Fraction of the remaining distance to cover after `dt` seconds (exponential approach). */
export function rate(dt: number, tau: number): number {
	if (tau <= 0) return 1;
	if (dt <= 0) return 0;
	return 1 - Math.exp(-dt / tau);
}

export interface Halo {
	/** Centre, in the same units as tile positions (device px). */
	x: number;
	y: number;
	/** Radius, same units. */
	r: number;
}

export interface StepParams {
	/** Distance between tile origins (device px). */
	pitch: number;
	/** Tile edge length (device px). */
	tile: number;
	attackTau: number;
	releaseTau: number;
}

/** Seconds to reach ~63% of the target when lighting up (≈0.34/frame at 60fps). */
export const ATTACK_TAU = 0.04;

/**
 * Advance every tile's heat toward its target for this frame.
 * Returns the largest remaining |target - heat| so the caller can stop the loop
 * once the field has settled.
 */
export function updateTiles(g: MosaicGrid, halo: Halo | null, dt: number, p: StepParams): number {
	const { cols, rows, weight, heat } = g;
	const kAttack = rate(dt, p.attackTau);
	const kRelease = rate(dt, p.releaseTau);
	const half = p.tile / 2;
	let maxDelta = 0;

	if (!halo || halo.r <= 0) {
		for (let i = 0; i < heat.length; i++) {
			const h = heat[i]!;
			if (h === 0) continue;
			const next = h - h * kRelease;
			heat[i] = next < 1e-4 ? 0 : next;
			if (next > maxDelta) maxDelta = next;
		}
		return maxDelta;
	}

	const invR2 = 1 / (halo.r * halo.r);
	for (let r = 0; r < rows; r++) {
		const dy = r * p.pitch + half - halo.y;
		const dy2 = dy * dy;
		for (let c = 0; c < cols; c++) {
			const i = r * cols + c;
			const dx = c * p.pitch + half - halo.x;
			const d2 = (dx * dx + dy2) * invR2;
			const target = d2 >= 1 ? 0 : falloff(Math.sqrt(d2)) * weight[i]!;
			const h = heat[i]!;
			const delta = target - h;
			if (delta === 0) continue;
			const next = h + delta * (delta > 0 ? kAttack : kRelease);
			heat[i] = next < 1e-4 ? 0 : next;
			const rem = Math.abs(target - heat[i]!);
			if (rem > maxDelta) maxDelta = rem;
		}
	}
	return maxDelta;
}

/** Slow ambient life: occasionally retarget a tile, then ease toward the target. */
export function flickerTiles(
	g: MosaicGrid,
	dt: number,
	chancePerSec: number,
	ambient: number,
	rng: () => number = Math.random
): void {
	const { ambient: amb, ambientTarget } = g;
	const p = chancePerSec * dt;
	const k = rate(dt, 0.4);
	for (let i = 0; i < amb.length; i++) {
		if (rng() < p) ambientTarget[i] = ambientLevel(rng(), ambient);
		amb[i] = amb[i]! + (ambientTarget[i]! - amb[i]!) * k;
	}
}

// --- colour ------------------------------------------------------------------

/** Parse `#rgb`, `#rrggbb` or `rgb(r, g, b)`. Returns null on anything else. */
export function parseRgb(input: string): Rgb | null {
	const s = input.trim();
	const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
	if (hex) {
		let h = hex[1]!;
		if (h.length === 3) h = h[0]! + h[0]! + h[1]! + h[1]! + h[2]! + h[2]!;
		const n = Number.parseInt(h, 16);
		return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
	}
	const rgb = /^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/i.exec(s);
	if (rgb) {
		return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])].map((v) => Math.min(255, v)) as Rgb;
	}
	return null;
}

export function mix(a: Rgb, b: Rgb, t: number): Rgb {
	const u = t < 0 ? 0 : t > 1 ? 1 : t;
	return [
		Math.round(a[0] + (b[0] - a[0]) * u),
		Math.round(a[1] + (b[1] - a[1]) * u),
		Math.round(a[2] + (b[2] - a[2]) * u),
	];
}

export const DEFAULT_COLOR: Rgb = [242, 195, 24];
export const DEFAULT_BACKGROUND: Rgb = [10, 10, 10];

/** Level at which the ramp reaches the pure halo colour; above it heads to the peak. */
export const LUT_KNEE = 0.55;

function rgbString(c: Rgb): string {
	return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

/**
 * Build the tile colour ramp: a hair above the background at 0, the halo colour
 * at the knee, a near-white tint of the halo colour at 1.
 */
export function buildLut(background: string, color: string, size = 64): string[] {
	const bg = parseRgb(background) ?? DEFAULT_BACKGROUND;
	const fg = parseRgb(color) ?? DEFAULT_COLOR;
	const tileBase = mix(bg, fg, 0.05);
	const peak = mix(fg, [255, 255, 255], 0.7);
	const out = new Array<string>(size);
	for (let i = 0; i < size; i++) {
		const t = size > 1 ? i / (size - 1) : 0;
		const c =
			t <= LUT_KNEE
				? mix(tileBase, fg, t / LUT_KNEE)
				: mix(fg, peak, (t - LUT_KNEE) / (1 - LUT_KNEE));
		out[i] = rgbString(c);
	}
	return out;
}

export function lutIndex(ambient: number, heat: number, intensity: number, size: number): number {
	let level = ambient + heat * intensity;
	if (level > 1) level = 1;
	else if (level < 0) level = 0;
	return (level * (size - 1)) | 0;
}

// --- idle drift + prop mapping -----------------------------------------------

const TWO_PI = Math.PI * 2;

/** Slow Lissajous wander that stays inside the box (periods 9s / 13s). */
export function driftPoint(t: number, w: number, h: number): { x: number; y: number } {
	return {
		x: w * (0.5 + 0.38 * Math.sin((TWO_PI * t) / 9 + 1.3)),
		y: h * (0.5 + 0.32 * Math.sin((TWO_PI * t) / 13)),
	};
}

/** `trail` 0..1 → release time constant in seconds. */
export function releaseTau(trail: number): number {
	return 0.05 + 0.7 * clamp01(trail);
}

/** `smoothing` 0..1 → pointer lag time constant in seconds (0 = instant). */
export function smoothingTau(smoothing: number): number {
	return 0.8 * clamp01(smoothing);
}

export function clamp01(v: number): number {
	if (!Number.isFinite(v)) return 0;
	return v < 0 ? 0 : v > 1 ? 1 : v;
}
