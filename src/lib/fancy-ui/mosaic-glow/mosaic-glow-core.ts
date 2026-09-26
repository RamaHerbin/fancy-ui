/**
 * MosaicGlow core — the framework-free half of the component.
 *
 * First the pure math, unit-testable without a browser: a seeded PRNG, per-tile
 * grid state, the halo falloff curve, the fps-independent heat step, ambient
 * flicker, the colour LUT and the idle drift path. Then `createMosaicGlow`, the
 * engine that owns the canvas, the rAF loop and the pointer listeners. No
 * framework imports, and nothing touches `window` or `document` at module scope,
 * so the file is safe to import on the server.
 *
 * Compiles under `noUncheckedIndexedAccess`, which widens every indexed read
 * to `| undefined`. The `!` assertions below are all in bounds by construction
 * (the loops are driven by the array's own length, the regex groups are
 * guaranteed by a successful match), so they change no behaviour.
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

// --- engine ------------------------------------------------------------------
//
// The browser half of the effect: canvas contexts, the rAF loop, the cached
// glass layer and the pointer listeners. Framework-free on purpose — a wrapper
// owns markup, a11y, the reduced-motion query and the observers, and feeds this
// engine through `setOptions` / `resize` / `destroy`.

/** What the halo does with no pointer: wander on its own or switch off. */
export type MosaicGlowIdle = "drift" | "none";

/** Wait after the pointer leaves before the idle drift takes over (ms). */
export const IDLE_DELAY_MS = 1500;
/** Ambient-only frames are drawn at most this often (ms). */
export const AMBIENT_FRAME_MS = 50;
/** Chance per second that a tile re-rolls its resting level. */
export const FLICKER_CHANCE = 0.15;
/** Steps in the tile colour ramp. */
export const LUT_SIZE = 64;

/** `tileSize` → tile edge in CSS px. */
export function normalizeTileSize(v: number): number {
	return Math.max(1, Number.isFinite(v) ? v : 18);
}

/** `gap` → gap between tiles in CSS px. */
export function normalizeGap(v: number): number {
	return Math.max(0, Number.isFinite(v) ? v : 2);
}

/** `radius` → halo radius in CSS px. */
export function normalizeRadius(v: number): number {
	return Math.max(1, Number.isFinite(v) ? v : 170);
}

export interface MosaicGlowElements {
	/** Positioned host: measured for the backing store, and the pointer surface. */
	host: HTMLElement;
	/** Canvas the mosaic is painted on. The engine owns its width/height. */
	canvas: HTMLCanvasElement;
}

/**
 * Mount-only options. MosaicGlow has none — every prop the wrapper passes is
 * reacted to after mount — so the split is recorded here as "nothing is frozen".
 */
export type MosaicGlowInitOptions = Record<never, never>;

/**
 * Options the engine reacts to after mount. `setOptions` acts on the keys that
 * are present (an absent or `undefined` key is left alone), grouped by concern
 * exactly as the wrapper's effects are:
 * structural (`tileSize`, `gap`, `seed`, `noise`, `ambient`) rebuilds the grid,
 * colour (`color`, `background`) drops the ramp cache, visual (`idle`,
 * `flicker`, `radius`, `intensity`) repaints, `reducedMotion` swaps the loop for
 * a single static frame, `interactive` attaches or detaches the pointer
 * listeners, `visible` pauses and resumes the loop. `trail` and `smoothing` are
 * read by the next frame and schedule nothing.
 */
export interface MosaicGlowLiveOptions {
	/** Tile edge in CSS px. */
	tileSize?: number;
	/** Gap between tiles in CSS px. */
	gap?: number;
	/** Halo / tile colour — hex or rgb(). */
	color?: string;
	/** Surface colour behind the tiles — hex or rgb(). */
	background?: string;
	/** Halo radius in CSS px. */
	radius?: number;
	/** Overall brightness of lit tiles, 0–1. */
	intensity?: number;
	/** How long lit tiles linger after the halo moves on, 0–1. */
	trail?: number;
	/** Pointer lag, 0 (instant) to 1 (very laggy). */
	smoothing?: number;
	/** Spread of per-tile random brightness inside the halo, 0–1. */
	noise?: number;
	/** Visibility of the random faint tiles outside the halo, 0–1. */
	ambient?: number;
	/** Slowly re-roll the faint tiles over time. */
	flicker?: boolean;
	/** What the halo does with no pointer. */
	idle?: MosaicGlowIdle;
	/** Follow the pointer. Off leaves only the idle behaviour. */
	interactive?: boolean;
	/** Seed for the per-tile randomness — same seed, same mosaic. */
	seed?: number;
	/** The wrapper's `prefers-reduced-motion` gate: no loop, one settled frame. */
	reducedMotion?: boolean;
	/** The wrapper's visibility gate: false parks the loop. */
	visible?: boolean;
}

export interface MosaicGlowEngine {
	setOptions(next: Partial<MosaicGlowLiveOptions>): void;
	/** Re-measure the host; rebuilds only when the box or the pixel ratio moved. */
	resize(): void;
	destroy(): void;
}

/**
 * Drive a MosaicGlow canvas. Returns null when no 2D context is available
 * (server, jsdom without a stub, a browser that refuses the context) — the
 * caller then simply renders an inert canvas.
 *
 * `random` feeds the ambient flicker only; the per-tile field is seeded through
 * the `seed` option and stays deterministic.
 */
export function createMosaicGlow(
	el: MosaicGlowElements,
	options: MosaicGlowInitOptions & MosaicGlowLiveOptions = {},
	random: () => number = Math.random
): MosaicGlowEngine | null {
	const host = el.host;
	const canvas = el.canvas;
	if (!host || !canvas) return null;
	let ctx: CanvasRenderingContext2D | null = canvas.getContext("2d");
	if (!ctx) return null;

	// --- options ---------------------------------------------------------------

	let tile = normalizeTileSize(options.tileSize ?? 18);
	let gap = normalizeGap(options.gap ?? 2);
	let color = options.color ?? "#f2c318";
	let background = options.background ?? "#0a0a0a";
	let radius = normalizeRadius(options.radius ?? 170);
	let intensity = clamp01(options.intensity ?? 1);
	let trail = clamp01(options.trail ?? 0.6);
	let smoothing = clamp01(options.smoothing ?? 0.15);
	let noise = clamp01(options.noise ?? 0.7);
	let ambient = clamp01(options.ambient ?? 0.35);
	let flicker = options.flicker ?? true;
	let idle: MosaicGlowIdle = options.idle ?? "drift";
	let interactive = options.interactive ?? true;
	let seed = options.seed ?? 1;
	let reducedMotion = options.reducedMotion ?? false;
	let visible = options.visible ?? true;

	// --- frame state (touched every frame, never rendered) ---------------------

	let glassLayer: HTMLCanvasElement | null = null;
	let grid: MosaicGrid | null = null;
	let lut: string[] | null = null;
	let dpr = 1;
	let cssW = 0;
	let cssH = 0;
	let w = 0;
	let h = 0;
	let pitchDev = 20;
	let tileDev = 18;

	let px = 0;
	let py = 0;
	let pointerOver = false;
	let sx = 0;
	let sy = 0;
	let sInit = false;
	let haloFade = 0;
	let driftT = 0;
	let lastLeaveAt = -1;

	let rafId: number | null = null;
	let lastTime = 0;
	let lastDraw = 0;
	/** Something structural changed (size, grid, colours): the next frame must paint. */
	let dirty = true;
	let destroyed = false;
	let pointerAttached = false;

	// --- setup -----------------------------------------------------------------

	/** Backing-store scale, capped so dense displays do not blow up the fill rate. */
	function currentDpr(): number {
		return Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
	}

	/** Unconditional rebuild: backing store, grid, glass layer, first paint. */
	function applyResize(): void {
		if (!ctx) return;
		cssW = host.clientWidth;
		cssH = host.clientHeight;
		dpr = currentDpr();
		w = Math.max(1, Math.round(cssW * dpr));
		h = Math.max(1, Math.round(cssH * dpr));
		canvas.width = w;
		canvas.height = h;
		tileDev = Math.max(1, Math.round(tile * dpr));
		pitchDev = Math.max(tileDev, Math.round((tile + gap) * dpr));
		const cols = Math.ceil(w / pitchDev);
		const rows = Math.ceil(h / pitchDev);
		grid = createGrid(cols, rows, seed, noise, ambient);
		rebuildGlass(cols, rows);
		dirty = true;
		if (reducedMotion) drawStatic(initialHalo());
		else requestFrame();
	}

	/** One cached full-size layer with a glassy highlight stamped on every tile. */
	function rebuildGlass(cols: number, rows: number): void {
		glassLayer = null;
		if (typeof document === "undefined") return;
		const sprite = document.createElement("canvas");
		sprite.width = tileDev;
		sprite.height = tileDev;
		const sctx = sprite.getContext("2d");
		if (!sctx) return;
		const grad = sctx.createRadialGradient(
			tileDev * 0.35,
			tileDev * 0.3,
			0,
			tileDev * 0.5,
			tileDev * 0.5,
			tileDev * 0.7
		);
		grad.addColorStop(0, "rgba(255, 255, 255, 0.22)");
		grad.addColorStop(1, "rgba(255, 255, 255, 0)");
		sctx.fillStyle = grad;
		sctx.fillRect(0, 0, tileDev, tileDev);

		const layer = document.createElement("canvas");
		layer.width = w;
		layer.height = h;
		const lctx = layer.getContext("2d");
		if (!lctx) return;
		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < cols; c++) {
				lctx.drawImage(sprite, c * pitchDev, r * pitchDev);
			}
		}
		glassLayer = layer;
	}

	function ensureLut(): string[] {
		if (!lut) lut = buildLut(background, color, LUT_SIZE);
		return lut;
	}

	function initialHalo(): Halo | null {
		if (idle !== "drift") return null;
		const p = driftPoint(0, w, h);
		return { x: p.x, y: p.y, r: radius * dpr };
	}

	// --- loop ------------------------------------------------------------------

	function requestFrame(): void {
		if (rafId !== null || !visible || reducedMotion || !ctx) return;
		if (typeof requestAnimationFrame !== "function") return;
		lastTime = 0;
		rafId = requestAnimationFrame(tick);
	}

	function stopLoop(): void {
		if (rafId !== null && typeof cancelAnimationFrame === "function") cancelAnimationFrame(rafId);
		rafId = null;
	}

	function tick(now: number): void {
		rafId = null;
		if (!ctx || !grid) return;

		const dt = lastTime === 0 ? 1 / 60 : Math.min(0.1, Math.max(0, (now - lastTime) / 1000));
		lastTime = now;

		const drifting =
			idle === "drift" && !pointerOver && (lastLeaveAt < 0 || now - lastLeaveAt > IDLE_DELAY_MS);
		let tx = 0;
		let ty = 0;
		let hasTarget = false;
		if (pointerOver) {
			tx = px;
			ty = py;
			hasTarget = true;
		} else if (drifting) {
			driftT += dt;
			const p = driftPoint(driftT, w, h);
			tx = p.x;
			ty = p.y;
			hasTarget = true;
		}

		if (hasTarget) {
			if (!sInit) {
				sx = tx;
				sy = ty;
				sInit = true;
			} else {
				const tau = drifting ? Math.max(smoothingTau(smoothing), 0.35) : smoothingTau(smoothing);
				const k = rate(dt, tau);
				sx += (tx - sx) * k;
				sy += (ty - sy) * k;
			}
		}

		const rel = releaseTau(trail);
		const fadeTarget = hasTarget ? 1 : 0;
		haloFade += (fadeTarget - haloFade) * rate(dt, fadeTarget > haloFade ? ATTACK_TAU : rel);
		if (haloFade < 0.005) haloFade = 0;

		const halo: Halo | null = hasTarget ? { x: sx, y: sy, r: radius * dpr } : null;
		const maxDelta = updateTiles(grid, halo, dt, {
			pitch: pitchDev,
			tile: tileDev,
			attackTau: ATTACK_TAU,
			releaseTau: rel,
		});
		if (flicker) flickerTiles(grid, dt, FLICKER_CHANCE, ambient, random);

		const active = hasTarget || maxDelta > 0.002 || haloFade > 0;
		if (active || dirty || now - lastDraw >= AMBIENT_FRAME_MS) {
			draw(halo);
			lastDraw = now;
			dirty = false;
		}

		const keepGoing = active || flicker || (idle === "drift" && !pointerOver);
		if (keepGoing && visible && typeof requestAnimationFrame === "function") {
			rafId = requestAnimationFrame(tick);
		}
	}

	/** Reduced motion: no loop — settle the field instantly and paint once. */
	function drawStatic(halo: Halo | null): void {
		if (!ctx || !grid) return;
		updateTiles(grid, halo, 1, { pitch: pitchDev, tile: tileDev, attackTau: 0, releaseTau: 0 });
		haloFade = halo ? 1 : 0;
		if (halo) {
			sx = halo.x;
			sy = halo.y;
		}
		draw(halo);
	}

	function draw(halo: Halo | null): void {
		const c = ctx;
		const g = grid;
		if (!c || !g) return;
		const table = ensureLut();
		const { cols, rows, ambient: amb, heat } = g;

		c.globalCompositeOperation = "source-over";
		c.fillStyle = background;
		c.fillRect(0, 0, w, h);

		let current = -1;
		for (let r = 0; r < rows; r++) {
			const y = r * pitchDev;
			for (let col = 0; col < cols; col++) {
				const i = r * cols + col;
				// In bounds by construction: the loops are driven by the grid's own dimensions,
				// and `lutIndex` clamps into [0, size - 1].
				const idx = lutIndex(amb[i]!, heat[i]!, intensity, LUT_SIZE);
				if (idx !== current) {
					c.fillStyle = table[idx]!;
					current = idx;
				}
				c.fillRect(col * pitchDev, y, tileDev, tileDev);
			}
		}

		if (glassLayer) {
			c.globalCompositeOperation = "soft-light";
			c.drawImage(glassLayer, 0, 0);
		}

		if (haloFade > 0) {
			const rgb = parseRgb(color) ?? DEFAULT_COLOR;
			const r = (halo ? halo.r : radius * dpr) * 1.15;
			const a = intensity * haloFade;
			const grad = c.createRadialGradient(sx, sy, 0, sx, sy, r);
			grad.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${(0.2 * a).toFixed(3)})`);
			grad.addColorStop(0.45, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${(0.07 * a).toFixed(3)})`);
			grad.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`);
			c.globalCompositeOperation = "lighter";
			c.fillStyle = grad;
			c.fillRect(sx - r, sy - r, r * 2, r * 2);
		}

		c.globalCompositeOperation = "source-over";
	}

	// --- pointer ---------------------------------------------------------------

	function onMove(e: PointerEvent): void {
		const rect = host.getBoundingClientRect();
		px = (e.clientX - rect.left) * dpr;
		py = (e.clientY - rect.top) * dpr;
		pointerOver = true;
		if (reducedMotion) drawStatic({ x: px, y: py, r: radius * dpr });
		else requestFrame();
	}

	function onLeave(): void {
		pointerOver = false;
		lastLeaveAt = typeof performance !== "undefined" ? performance.now() : Date.now();
		if (reducedMotion) drawStatic(initialHalo());
		else requestFrame();
	}

	function syncPointer(): void {
		const want = interactive && !destroyed;
		if (want === pointerAttached) return;
		if (want) {
			host.addEventListener("pointermove", onMove, { passive: true });
			host.addEventListener("pointerleave", onLeave);
			host.addEventListener("pointercancel", onLeave);
		} else {
			host.removeEventListener("pointermove", onMove);
			host.removeEventListener("pointerleave", onLeave);
			host.removeEventListener("pointercancel", onLeave);
			pointerOver = false;
		}
		pointerAttached = want;
	}

	// --- public surface --------------------------------------------------------

	function setOptions(next: Partial<MosaicGlowLiveOptions>): void {
		if (destroyed) return;
		const structural =
			next.tileSize !== undefined ||
			next.gap !== undefined ||
			next.seed !== undefined ||
			next.noise !== undefined ||
			next.ambient !== undefined;
		const colour = next.color !== undefined || next.background !== undefined;
		const visual =
			next.idle !== undefined ||
			next.flicker !== undefined ||
			next.radius !== undefined ||
			next.intensity !== undefined;
		const motion = next.reducedMotion !== undefined;
		const pointer = next.interactive !== undefined;
		const visibility = next.visible !== undefined;

		if (next.tileSize !== undefined) tile = normalizeTileSize(next.tileSize);
		if (next.gap !== undefined) gap = normalizeGap(next.gap);
		if (next.seed !== undefined) seed = next.seed;
		if (next.noise !== undefined) noise = clamp01(next.noise);
		if (next.ambient !== undefined) ambient = clamp01(next.ambient);
		if (next.color !== undefined) color = next.color;
		if (next.background !== undefined) background = next.background;
		if (next.radius !== undefined) radius = normalizeRadius(next.radius);
		if (next.intensity !== undefined) intensity = clamp01(next.intensity);
		if (next.trail !== undefined) trail = clamp01(next.trail);
		if (next.smoothing !== undefined) smoothing = clamp01(next.smoothing);
		if (next.flicker !== undefined) flicker = next.flicker;
		if (next.idle !== undefined) idle = next.idle;
		if (next.interactive !== undefined) interactive = next.interactive;
		if (next.reducedMotion !== undefined) reducedMotion = next.reducedMotion;
		if (next.visible !== undefined) visible = next.visible;

		if (pointer) syncPointer();

		// Structural props rebuild the grid (heat resets — acceptable, it is structural).
		if (structural) applyResize();

		if (colour) {
			lut = null;
			dirty = true;
			if (reducedMotion) drawStatic(haloFade > 0 ? { x: sx, y: sy, r: radius * dpr } : null);
			else requestFrame();
		}

		// Loop- and paint-affecting props: restart a stopped loop, repaint a static frame.
		if (visual) {
			dirty = true;
			if (reducedMotion)
				drawStatic(pointerOver ? { x: sx, y: sy, r: radius * dpr } : initialHalo());
			else requestFrame();
		}

		if (motion) {
			if (reducedMotion) {
				stopLoop();
				drawStatic(initialHalo());
			} else {
				requestFrame();
			}
		}

		if (visibility) {
			if (visible) requestFrame();
			else stopLoop();
		}
	}

	function resize(): void {
		if (destroyed || !ctx) return;
		// Zoom and display moves can change the pixel ratio at a constant CSS size.
		if (host.clientWidth === cssW && host.clientHeight === cssH && currentDpr() === dpr) return;
		applyResize();
	}

	function destroy(): void {
		if (destroyed) return;
		destroyed = true;
		stopLoop();
		syncPointer();
		ctx = null;
		grid = null;
		glassLayer = null;
		lut = null;
	}

	applyResize();
	syncPointer();

	return { setOptions, resize, destroy };
}
