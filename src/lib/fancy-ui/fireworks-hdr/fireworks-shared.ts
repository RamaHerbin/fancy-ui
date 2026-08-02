// Pure physics/animation core for FireworksHdr — DOM-free and GPU-free.
//
// Transcribes the frozen physics spec (§1–§7). Positions are normalized
// [0,1] with a top-left, y-down origin. Velocities and accelerations are in
// VISUAL units (screen-heights/sec, isotropic); aspect A = canvasW/canvasH is
// applied only when integrating x (`pos.x += (vel.x / A) · dt`) and when
// converting a normalized position error to visual units (seeker springs).
//
// Determinism invariant: everything reachable from `step()` derives its
// randomness from stored per-particle seeds (hash-based value noise), never
// `Math.random`. `Math.random` only ever appears behind an injectable `rng()`
// used at spawn/schedule time (launch, ambient scheduling), so a fixed seed +
// fixed rng reproduce a frame exactly. This is what makes the lib testable.

// =============================================================================
// §1 — Pool layout, field map, enums, public types
// =============================================================================

/** Floats per particle in the interleaved pool. */
export const STRIDE = 17;

/** Field offsets inside one particle's STRIDE-float slot. */
export const F = {
	posX: 0,
	posY: 1,
	velX: 2,
	velY: 3,
	age: 4,
	ttl: 5,
	size: 6,
	r: 7,
	g: 8,
	b: 9,
	brightness: 10,
	type: 11,
	seed: 12,
	targetX: 13,
	targetY: 14,
	dragScale: 15,
	/**
	 * Per-particle depth dim in (0,1] — the launch's `depth` folded into a
	 * single multiplier applied to the resolved brightness every frame (§3.6).
	 * Defaults to 1 for every spawn (see `appendParticle`), so only depth-aware
	 * spawns need to write it.
	 */
	depthDim: 16,
} as const;

export const TYPE = {
	ROCKET: 0,
	SPARK: 1,
	EMBER: 2,
	SMOKE: 3,
	FLASH: 4,
	SEEKER: 5,
} as const;
export type ParticleType = (typeof TYPE)[keyof typeof TYPE];

export interface Vec2 {
	x: number;
	y: number;
}
/** Linear RGB; channels may exceed 1.0 (HDR headroom). */
export interface Rgb {
	r: number;
	g: number;
	b: number;
}

export type ShellKind = "peony" | "willow" | "ring" | "glyph" | "heart" | "star" | "shape";
export type Intensity = "intro" | "ambient";
export type QualityTier = "high" | "mid" | "low";

export interface LaunchOptions {
	apex: Vec2;
	from?: Vec2;
	/** @default 'peony' */
	shell?: ShellKind;
	/** Single hue or an adjacent duo; omitted → palette ping-pong sweep. */
	color?: Rgb | Rgb[];
	/** REQUIRED when `shell === 'glyph'`: normalized target points. */
	glyphPoints?: Vec2[];
	/**
	 * REQUIRED when `shell === 'shape'`: the closed figure the burst is cut
	 * from, as y-UP points around the origin. Scale is free — the outline is
	 * normalized to the unit circle, then drawn at the shell's radius. Points are
	 * walked in order and the figure is closed automatically, so a hand-written
	 * polygon works as well as a sampled curve.
	 */
	shapePoints?: Vec2[];
	scale?: number;
	flightMs?: number;
	/** @default 'ambient' */
	intensity?: Intensity;
	/** [0,1] — far shells render dimmer, smaller, less saturated. */
	depth?: number;
	seed?: number;
	/** Glyph only: sim self-triggers seeker release at this time (ms after launch). */
	releaseAtMs?: number;
}

export interface LaunchResult {
	flightMs: number;
	/** flightMs + fuse-hang; when the shell detonates. */
	breakMs: number;
}

/**
 * How the fireworks are actually being rendered (sampled once at handle
 * creation; does not follow the window to another display):
 * - "webgpu-hdr": WebGPU with extended tone mapping active AND a display
 *   reporting `(dynamic-range: high)` — true brighter-than-white output.
 * - "webgpu-sdr": WebGPU float16 + P3, but the browser clamped tone mapping or
 *   the display is SDR.
 * - "webgl-p3":  WebGL2 fallback with a display-p3 drawing buffer.
 * - "webgl-sdr": WebGL2 fallback, plain sRGB.
 * - "none":      no GPU rendering available; the component never fires onReady.
 */
export type FireworksRenderLevel = "webgpu-hdr" | "webgpu-sdr" | "webgl-p3" | "webgl-sdr" | "none";

/**
 * Imperative control surface handed to `FireworksHdr`'s `onReady` callback
 * (§1). Coordinates are normalized [0,1], top-left origin.
 */
export interface FireworksHandle {
	/** Fire a shell; returns the resolved flight/break timing. */
	launch(opts: LaunchOptions): LaunchResult;
	/** Toggle the ambient auto-scheduler; optionally set its intensity [0,1]. */
	setAmbient(on: boolean, intensity?: number): void;
	/** Set (or clear) the keep-clear rect ambient apexes must avoid. */
	setKeepClear(rect: Rect | null): void;
	/** Set the display exposure multiplier (clamped [1,4] by the renderer). */
	setExposure(v: number): void;
	readonly renderLevel: FireworksRenderLevel;
	/** Stop the loop, remove listeners, and release GPU resources. */
	cleanup(): void;
}

export interface Zone {
	rect: Rect;
	weight: number;
}
export interface Rect {
	x0: number;
	y0: number;
	x1: number;
	y1: number;
}

export interface TierSpec {
	maxParticles: number;
	trailRate: number;
}
export interface ShellRecipe {
	counts: Record<QualityTier, number>;
	emberFrac: number;
	smoke: number;
	radius: [number, number];
	builder: BurstBuilderKind;
	/**
	 * Pattern shells only: the unit outline the burst is cut from, sampled at
	 * `t ∈ [0,1)`. Points are y-UP and bounded by the unit circle; the burst
	 * converts to the sim's y-down convention.
	 */
	outline?: Outline;
	/**
	 * Pattern shells hold a readable figure, so they suppress the break
	 * asymmetry, the stragglers and most of the embers that would smear it.
	 */
	crisp?: boolean;
}
type BurstBuilderKind = "sphere" | "willow" | "ring" | "glyph" | "outline";

/** A closed unit figure: `t ∈ [0,1)` → point, y-up, `|p| ≤ 1`. */
export type Outline = (t: number) => Vec2;

export interface Sim {
	launch(opts: LaunchOptions): LaunchResult;
	spawnFlash(pos: Vec2, brightness: number, sizeNorm: number, hue: Rgb): void;
	/** Advances the simulation; `dt` is clamped to DT_MAX internally. */
	step(dtSeconds: number, wind?: Vec2): void;
	/** Writes 8-float instances into `out`; returns the live instance count. */
	writeInstances(out: Float32Array): number;
	setAspect(aspect: number): void;
	/**
	 * Set (or clear) the keep-clear rect. Detonation apexes are the scheduler's
	 * job to steer away; here it only soft-dims stray particles (§4.5) that drift
	 * inside so the area behind the card stays calm.
	 */
	setKeepClear(rect: Rect | null): void;
	/**
	 * Scale new burst particle counts (spawn density) in [0,1]. The adaptive
	 * downgrade uses this as its pop-free CPU lever; glyph seekers are driven by
	 * explicit points and are never scaled. Default 1 (no change).
	 */
	setSpawnScale(scale: number): void;
	reset(): void;
	readonly count: number;
	readonly capacity: number;
	readonly droppedSpawns: number;
	/** Interleaved pool, read-only view (first `count · STRIDE` floats live). */
	readonly data: Float32Array;
}

export interface SimOptions {
	quality: QualityTier;
	aspect: number;
	hdr: boolean;
	/** Injectable spawn/schedule randomness; defaults to Math.random. */
	rng?: () => number;
	wind?: Vec2;
	/** Linear-RGB palette (ping-pong order); defaults to PALETTE. */
	palette?: Rgb[];
}

// =============================================================================
// §2 — Constants
// =============================================================================

// §2.1 World
export const G = 3.6; // visual gravity, +y down
export const DT_MAX = 0.033;
export const LAUNCH_Y: [number, number] = [1.02, 1.08];
export const LAUNCH_X: [number, number] = [0.08, 0.92];

// §2.4 Render/exposure
export const EXPOSURE_AMBIENT = 2.2;
export const EXPOSURE_INTRO = 2.6;
export const SDR_KNEE_START = 0.8;
export const SDR_CORE_SCALE = 1.4;
export const SDR_SAT_BOOST = 0.12;

// §7 instance velocity-stretch (seconds of motion baked into the quad's major
// axis). Small on purpose — the accumulation trail already conveys motion, and
// stacking a long stretch on top of it turns every spark into a needle.
export const STRETCH = 0.01;

// §2.3 Brightness ladder (pre-exposure; 1.0 = SDR white)
export const B_FLASH_INTRO = 3.4;
export const B_FLASH_AMBIENT = 2.1;
export const B_SPARK_FRESH = 2.2;
export const B_SPARK_STEADY = 0.9;
export const B_SPARK_TERMINAL = 0.15;
export const B_ASCENT_HEAD = 2.8;
export const B_ASCENT_TAIL = 0.45;
export const B_BURST_STREAK = 0.5;
export const B_EMBER_MEAN = 0.35;
export const B_SMOKE_MIN = 0.05;
export const B_SMOKE_MAX = 0.12;
export const B_GLYPH_HOLD = 1.3;
export const B_GLYPH_RELEASE = 2.6;
export const B_HAZE_CEIL = 0.18;
export const CRACKLE_HZ = 24;

// §2.5 Palette (ping-pong index order: cyan, blue, violet, magenta)
export const PALETTE_HEX = ["#42cfff", "#3d5bff", "#a142ff", "#ff2fd6"] as const;
export const COOL_END_HEX = "#ffcf9c";
export const MAGNESIUM_HEX = "#f4f8ff";
export const COMET_HEAD_HEX = "#fff2e0";
export const SMOKE_HEX = "#0a0b10";

// Shell hue jitter (oklab degrees) and spark hue jitter — §2.5 / §1.6
export const SHELL_JITTER_DEG = 7;
export const SPARK_JITTER_DEG = 3;

// Ascent wobble (§4): lateral drift rate and its frequency. Applied to the
// rocket's position only — the velocity, and therefore the solved apex, is
// untouched, so the wobble cannot walk a shell off its target.
export const ROCKET_WOBBLE_AMP = 0.045;
export const ROCKET_WOBBLE_HZ = 11;

// Spark life-color schedule (§1.7): white → shell hue → cool end.
export const HUE_ARRIVES_AT = 0.34;
export const COOL_START = 0.72;
// Share of a shell's sparks that crackle — a fast on/off flicker (CRACKLE_HZ)
// on top of the normal decay. This is the "silver" chatter of a real break.
export const CRACKLE_FRAC = 0.06;

// Depth response for `depth ∈ [0,1]`: a far shell is dimmer, smaller, less
// saturated AND spatially tighter. Every term is applied at spawn (the dim as a
// per-particle multiplier on the brightness curve) so the same shell reads as
// "further back" on all of its debris — sparks, embers, smoke, flash, glyph.
export const DEPTH_DIM = 0.45; // brightness ×(1 − 0.45·d)
export const DEPTH_SIZE = 0.5; // particle size ×(1 − 0.5·d)
export const DEPTH_CHROMA = 0.35; // saturation ×(1 − 0.35·d)
export const DEPTH_RADIUS = 0.25; // burst radius ×(1 − 0.25·d)

// §2.6 Wind: session vector magnitudes (visual accel)
const WIND_X: [number, number] = [0.02, 0.05];
const WIND_Y: [number, number] = [0.01, 0.02];

// Per-type wind scale (§2.2 windScale column)
const WIND_SCALE: Record<ParticleType, number> = {
	[TYPE.ROCKET]: 0.05,
	[TYPE.SPARK]: 0.3,
	[TYPE.EMBER]: 0.7,
	[TYPE.SMOKE]: 1.0,
	[TYPE.FLASH]: 0,
	[TYPE.SEEKER]: 0.4,
};

// Per-type gravity scale (§2.2 gravScale column). Sparks and embers fall at a
// small fraction of the rocket's gravity: at full G their terminal velocity
// (g·G/drag) dwarfs the burst's own expansion speed, so a shell never opens
// into a sphere — it rains straight down as a fountain. Keeping ember gravity
// above spark gravity is what still separates a willow's droop from a peony.
const GRAV_SCALE: Record<ParticleType, number> = {
	[TYPE.ROCKET]: 1.0,
	[TYPE.SPARK]: 0.15,
	[TYPE.EMBER]: 0.3,
	[TYPE.SMOKE]: -0.05,
	[TYPE.FLASH]: 0,
	[TYPE.SEEKER]: 0, // gravity is phase-driven for seekers
};

// Per-type drag (1/s, §2.2 drag column)
const DRAG: Record<ParticleType, number> = {
	[TYPE.ROCKET]: 0.6,
	[TYPE.SPARK]: 2.2,
	[TYPE.EMBER]: 2.4,
	[TYPE.SMOKE]: 3.0,
	[TYPE.FLASH]: 0,
	[TYPE.SEEKER]: 1.2,
};

// Burst initial speed = radius · this (visual units). Under linear drag a spark
// coasts v0/drag, so k ≈ drag makes the shell open to about its nominal radius
// before the droop takes over. Not spec-pinned — a visual constant.
const BURST_SPEED_K = 3.0;

// §3 Quality tiers
export const QUALITY: Record<QualityTier, TierSpec> = {
	high: { maxParticles: 4096, trailRate: 180 },
	mid: { maxParticles: 2560, trailRate: 120 },
	low: { maxParticles: 1280, trailRate: 60 },
};

// §3 Shell recipes
export const SHELL: Record<ShellKind, ShellRecipe> = {
	peony: {
		counts: { high: 320, mid: 200, low: 120 },
		emberFrac: 0.15,
		smoke: 1,
		radius: [0.1, 0.2],
		builder: "sphere",
	},
	willow: {
		counts: { high: 200, mid: 130, low: 80 },
		emberFrac: 0.8,
		smoke: 1,
		radius: [0.14, 0.22],
		builder: "willow",
	},
	ring: {
		counts: { high: 180, mid: 120, low: 70 },
		emberFrac: 0.1,
		smoke: 0,
		radius: [0.12, 0.2],
		builder: "ring",
	},
	glyph: {
		counts: { high: 0, mid: 0, low: 0 }, // driven by glyphPoints + garnish
		emberFrac: 0,
		smoke: 1,
		radius: [0.14, 0.14],
		builder: "glyph",
	},
	// Pattern shells: the figure IS the shell, so they run denser than a peony of
	// the same radius (an outline needs particles per unit of arc, not per unit of
	// volume) and suppress everything that would blur it.
	heart: {
		counts: { high: 260, mid: 170, low: 100 },
		emberFrac: 0.05,
		smoke: 1,
		radius: [0.13, 0.2],
		builder: "outline",
		outline: heartOutline,
		crisp: true,
	},
	star: {
		counts: { high: 240, mid: 160, low: 95 },
		emberFrac: 0.05,
		smoke: 1,
		radius: [0.13, 0.2],
		builder: "outline",
		outline: starOutline(5, 0.45),
		crisp: true,
	},
	// Caller-supplied figure — see LaunchOptions.shapePoints.
	shape: {
		counts: { high: 260, mid: 170, low: 100 },
		emberFrac: 0.05,
		smoke: 1,
		radius: [0.13, 0.2],
		builder: "outline",
		crisp: true,
	},
};

// §4.4 Ambient burst radius ceiling (fraction of min-dim). Distinct from the
// larger "feature" band (0.24) reserved for non-ambient bursts — the ambient
// scheduler derives its own scale per shell to respect this at any intensity.
export const AMBIENT_RADIUS_MAX = 0.2;

// §4.2 Ambient apex zones (weights sum to 1.0)
export const AMBIENT_ZONES: Zone[] = [
	{ rect: { x0: 0.04, y0: 0.08, x1: 0.34, y1: 0.4 }, weight: 0.28 }, // UL
	{ rect: { x0: 0.66, y0: 0.08, x1: 0.96, y1: 0.4 }, weight: 0.28 }, // UR
	{ rect: { x0: 0.34, y0: 0.05, x1: 0.66, y1: 0.24 }, weight: 0.18 }, // TC
	{ rect: { x0: 0.02, y0: 0.34, x1: 0.2, y1: 0.62 }, weight: 0.13 }, // LM
	{ rect: { x0: 0.8, y0: 0.34, x1: 0.98, y1: 0.62 }, weight: 0.13 }, // RM
];

// §4.5 Keep-clear rects (desktop / mobile) — the card area apexes must avoid.
export const KEEP_CLEAR_DESKTOP: Rect = { x0: 0.28, y0: 0.3, x1: 0.72, y1: 0.82 };
export const KEEP_CLEAR_MOBILE: Rect = { x0: 0.1, y0: 0.22, x1: 0.9, y1: 0.9 };

// §4.5 soft dim — brightness multiplier for stray particles that drift behind
// the keep-clear card. Apexes are hard-rejected there, so this only ever bites
// drift-ins (embers, smoke, spent sparks, rocket trails), keeping the haze
// behind the card under the §4.6 ceiling.
export const KEEP_CLEAR_DIM = 0.35;

// =============================================================================
// §2.7 — Deterministic value noise
// =============================================================================

/** Sign-stable fract; matches the WGSL `fract`. */
function fract(x: number): number {
	return x - Math.floor(x);
}

/** hash11(x) = fract(sin(x·127.1)·43758.5453) — deterministic scalar hash. */
export function hash11(x: number): number {
	return fract(Math.sin(x * 127.1) * 43758.5453);
}

/**
 * 1-D value noise in [0,1). Smooth-interpolated hash lattice sampled at
 * `age·freq`, offset by `seed`. Deterministic per (seed, age, freq).
 */
export function flickerNoise(seed: number, ageSec: number, freqHz: number): number {
	const t = ageSec * freqHz;
	const i = Math.floor(t);
	const f = t - i;
	const a = hash11(seed + i);
	const b = hash11(seed + i + 1);
	const u = f * f * (3 - 2 * f);
	return a + (b - a) * u;
}

/** smoothstep with edge0 possibly > edge1 (used by the death gate). */
export function smoothstep(edge0: number, edge1: number, x: number): number {
	const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
	return t * t * (3 - 2 * t);
}

/**
 * Last-10%-of-life brightness gate (§2.1 / §3.6). Equals 1 up to lifeT 0.9,
 * eases to 0 at lifeT 1.0 — so a particle's brightness reaches 0 exactly when
 * it is removed, honoring "nothing removed at nonzero brightness".
 */
export function deathGate(lifeT: number): number {
	return smoothstep(1.0, 0.9, lifeT);
}

// =============================================================================
// Color: sRGB ↔ linear ↔ oklab, hue rotation, life ramps
// =============================================================================

function srgbToLinear(c: number): number {
	return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function linearToSrgb(c: number): number {
	const x = Math.max(0, c);
	return x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
}

/** Parse `#rrggbb` to linear RGB. Falls back to white on malformed input. */
export function hexToLinearRgb(hex: string): Rgb {
	const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	if (!m) return { r: 1, g: 1, b: 1 };
	return {
		r: srgbToLinear(parseInt(m[1], 16) / 255),
		g: srgbToLinear(parseInt(m[2], 16) / 255),
		b: srgbToLinear(parseInt(m[3], 16) / 255),
	};
}

interface Oklab {
	L: number;
	a: number;
	b: number;
}

// Alloc-free scratch for the color math. The hot path (writeInstances →
// displayColor) reuses `*Into` variants so no oklab/RGB objects are minted per
// particle per frame; the exported pure functions below delegate to the same
// code so there is one arithmetic source of truth (determinism-preserving).
// Safe as module-level singletons: the sim is single-threaded and one
// writeInstances call fully unwinds before the next, so no two conversions are
// ever in flight at once.
const _okA: Oklab = { L: 0, a: 0, b: 0 };
const _okB: Oklab = { L: 0, a: 0, b: 0 };
const _okMix: Oklab = { L: 0, a: 0, b: 0 };
const _sparkHue: Rgb = { r: 0, g: 0, b: 0 };

/** Linear RGB → oklab, into `out` (no allocation). */
function linearToOklabInto(c: Rgb, out: Oklab): void {
	const l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
	const m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
	const s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
	const l_ = Math.cbrt(l);
	const m_ = Math.cbrt(m);
	const s_ = Math.cbrt(s);
	out.L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
	out.a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
	out.b = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
}

/** oklab → linear RGB, into `out` (no allocation). */
function oklabToLinearInto(o: Oklab, out: Rgb): void {
	const l_ = o.L + 0.3963377774 * o.a + 0.2158037573 * o.b;
	const m_ = o.L - 0.1055613458 * o.a - 0.0638541728 * o.b;
	const s_ = o.L - 0.0894841775 * o.a - 1.291485548 * o.b;
	const l = l_ * l_ * l_;
	const m = m_ * m_ * m_;
	const s = s_ * s_ * s_;
	out.r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
	out.g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
	out.b = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
}

/** hueRotate into `out` (no allocation). `out` may not alias `c`. */
function hueRotateInto(c: Rgb, deg: number, out: Rgb): void {
	linearToOklabInto(c, _okA);
	const chroma = Math.hypot(_okA.a, _okA.b);
	const h = Math.atan2(_okA.b, _okA.a) + (deg * Math.PI) / 180;
	_okMix.L = _okA.L;
	_okMix.a = chroma * Math.cos(h);
	_okMix.b = chroma * Math.sin(h);
	oklabToLinearInto(_okMix, out);
}

/** mixOklab into `out` (no allocation). `out` may not alias `a` or `b`. */
function mixOklabInto(a: Rgb, b: Rgb, t: number, out: Rgb): void {
	linearToOklabInto(a, _okA);
	linearToOklabInto(b, _okB);
	_okMix.L = _okA.L + (_okB.L - _okA.L) * t;
	_okMix.a = _okA.a + (_okB.a - _okA.a) * t;
	_okMix.b = _okA.b + (_okB.b - _okA.b) * t;
	oklabToLinearInto(_okMix, out);
}

/** Linear RGB → oklab. */
export function linearToOklab(c: Rgb): Oklab {
	const out: Oklab = { L: 0, a: 0, b: 0 };
	linearToOklabInto(c, out);
	return out;
}

/** oklab → linear RGB (may return negative channels for out-of-gamut hues). */
export function oklabToLinear(o: Oklab): Rgb {
	const out: Rgb = { r: 0, g: 0, b: 0 };
	oklabToLinearInto(o, out);
	return out;
}

/** Rotate a linear-RGB color's oklab hue by `deg` degrees (chroma preserved). */
export function hueRotate(c: Rgb, deg: number): Rgb {
	const out: Rgb = { r: 0, g: 0, b: 0 };
	hueRotateInto(c, deg, out);
	return out;
}

/** Scale a color's oklab chroma by `k` (desaturate when k<1). */
function scaleChroma(c: Rgb, k: number): Rgb {
	const o = linearToOklab(c);
	return oklabToLinear({ L: o.L, a: o.a * k, b: o.b * k });
}

/** Perceptual mix of two linear-RGB colors in oklab. */
export function mixOklab(a: Rgb, b: Rgb, t: number): Rgb {
	const out: Rgb = { r: 0, g: 0, b: 0 };
	mixOklabInto(a, b, t, out);
	return out;
}

/** sparkColorAtLife into `out` (no allocation). `out` may not alias `shellHue`. */
function sparkColorAtLifeInto(
	shellHue: Rgb,
	lifeT: number,
	whiteHold: number,
	seed: number,
	out: Rgb
): void {
	hueRotateInto(shellHue, (hash11(seed) * 2 - 1) * SPARK_JITTER_DEG, _sparkHue);
	if (lifeT <= whiteHold) {
		out.r = MAGNESIUM.r;
		out.g = MAGNESIUM.g;
		out.b = MAGNESIUM.b;
		return;
	}
	// The magnesium flash reads as the detonation, not as the shell: it has to
	// hand over to the shell hue early (by ~a third of the life) or a burst is
	// a white ball for most of the time anyone is looking at it.
	if (lifeT < HUE_ARRIVES_AT) {
		const t = (lifeT - whiteHold) / (HUE_ARRIVES_AT - whiteHold);
		mixOklabInto(MAGNESIUM, _sparkHue, Math.min(1, t), out);
		return;
	}
	if (lifeT < COOL_START) {
		out.r = _sparkHue.r;
		out.g = _sparkHue.g;
		out.b = _sparkHue.b;
		return;
	}
	const t = (lifeT - COOL_START) / (1 - COOL_START);
	mixOklabInto(_sparkHue, COOL_END, Math.min(1, t), out);
}

// Resolved palette constants (linear).
export const PALETTE: Rgb[] = PALETTE_HEX.map(hexToLinearRgb);
const COOL_END = hexToLinearRgb(COOL_END_HEX);
const MAGNESIUM = hexToLinearRgb(MAGNESIUM_HEX);
const COMET_HEAD = hexToLinearRgb(COMET_HEAD_HEX);
const SMOKE_COLOR = hexToLinearRgb(SMOKE_HEX);
// How far the ascent trail is pulled from the comet head toward the shell hue.
// The blend is done once per launch (stored on the spec) so emitTrail never
// re-mixes (3 oklab allocations) per emitted spark, and a branded palette gets
// its own trail instead of the built-in cyan.
export const COMET_TRAIL_MIX = 0.25;
// Fallback tint for a trail whose launch spec is already gone (the rocket
// outlived its detonation record) — the built-in palette's cool end.
const COMET_TRAIL_HUE = mixOklab(COMET_HEAD, PALETTE[0], COMET_TRAIL_MIX);

// =============================================================================
// §1 pure helpers — kinematics, bursts, spring, hue sweep, scheduling
// =============================================================================

/**
 * The medium a solved launch actually flies through. Omit it (or pass zeroed
 * fields) for the textbook undamped, square-canvas trajectory; pass the sim's
 * own numbers and the solve inverts the SAME model `integrate` applies, so the
 * shell really peaks at `apex` instead of undershooting by the drag it was
 * never told about.
 */
export interface LaunchMedium {
	/** Linear drag on the rocket (1/s) — `DRAG[TYPE.ROCKET]`. 0 → ballistic. */
	drag?: number;
	/** Canvas aspect W/H; x integrates as `pos.x += (vel.x / A) · dt`. */
	aspect?: number;
	/** Horizontal wind accel, already scaled by the rocket's windScale. */
	windX?: number;
	/** Vertical wind accel (+y down), already scaled by the rocket's windScale. */
	windY?: number;
}

/** Rise height reached by an up-velocity `vu0` under gravity `g` and drag `k`. */
function riseUnderDrag(vu0: number, g: number, k: number): number {
	return vu0 / k - (g / (k * k)) * Math.log(1 + (k * vu0) / g);
}

/**
 * Solve a rocket's launch velocity (§4). With `flightMs` the timing wins
 * (vy = 0 exactly at flight, apex.y only targets x); without it the flight is
 * derived so the trajectory peaks at apex.y.
 *
 * `medium` makes the solve match the integrator: with drag `k` the vertical
 * motion is `vu(t) = (vu0 + g/k)·e^(−kt) − g/k` (apex where that hits 0) and
 * the horizontal one integrates to `(vx0 − ax/k)(1 − e^(−kt))/k + (ax/k)·t`,
 * divided by the aspect. Without it both collapse to the undamped forms.
 */
export function solveLaunch(
	from: Vec2,
	apex: Vec2,
	g: number,
	flightMs?: number,
	medium?: LaunchMedium
): { v0: Vec2; flightMs: number } {
	const k = medium?.drag ?? 0;
	const aspect = medium?.aspect ?? 1;
	const ax = medium?.windX ?? 0;
	// Wind on y is a constant accel, so it just shifts effective gravity.
	const gEff = Math.max(1e-4, g + (medium?.windY ?? 0));
	const dy = Math.max(0, from.y - apex.y);
	const dx = (apex.x - from.x) * aspect;

	if (k <= 0) {
		const fs = flightMs !== undefined ? flightMs / 1000 : Math.sqrt((2 * dy) / gEff);
		const safeFs = fs > 1e-4 ? fs : 1e-4;
		// Δx = vx0·t + ½·ax·t² → vx0 = Δx/t − ½·ax·t.
		return {
			v0: { x: dx / safeFs - 0.5 * ax * safeFs, y: -gEff * fs },
			flightMs: fs * 1000,
		};
	}

	let vu0: number;
	let fs: number;
	if (flightMs !== undefined) {
		fs = flightMs / 1000;
		// vu(t) = 0 at t = fs  ⇒  vu0 = (g/k)·(e^(k·fs) − 1).
		vu0 = (gEff / k) * (Math.exp(k * Math.max(0, fs)) - 1);
	} else {
		// Invert rise(vu0) = dy by Newton (monotonic; rise' = vu0/(g + k·vu0)),
		// seeded with the undamped answer — converges in a handful of steps.
		vu0 = Math.sqrt(2 * gEff * dy);
		for (let i = 0; i < 12; i++) {
			const err = riseUnderDrag(vu0, gEff, k) - dy;
			const slope = vu0 / (gEff + k * vu0);
			if (Math.abs(err) < 1e-9 || slope <= 0) break;
			vu0 = Math.max(0, vu0 - err / slope);
		}
		fs = (1 / k) * Math.log(1 + (k * vu0) / gEff);
	}

	const safeFs = fs > 1e-4 ? fs : 1e-4;
	// Δx = (ax/k)·t + (vx0 − ax/k)·(1 − e^(−k·t))/k → solve for vx0.
	const decay = 1 - Math.exp(-k * safeFs);
	const drift = ax / k;
	const vx0 = drift + ((dx - drift * safeFs) * k) / decay;
	return { v0: { x: vx0, y: -vu0 }, flightMs: fs * 1000 };
}

/** Gravity that makes a launch from `from` peak at `apex.y` in `flightSec`. */
export function solveGravity(from: Vec2, apex: Vec2, flightSec: number): number {
	return (2 * (from.y - apex.y)) / (flightSec * flightSec);
}

export interface BurstDir {
	dir: Vec2;
	z: number;
}

/** Fibonacci-sphere burst (peony). `dir` is the in-plane projection, `z` depth. */
export function sphereBurst(n: number, seed: number): BurstDir[] {
	const out: BurstDir[] = [];
	const golden = Math.PI * (3 - Math.sqrt(5));
	const phi0 = hash11(seed) * Math.PI * 2;
	for (let i = 0; i < n; i++) {
		const z = 1 - (2 * (i + 0.5)) / n;
		const r = Math.sqrt(Math.max(0, 1 - z * z));
		const phi = phi0 + i * golden;
		out.push({ dir: { x: r * Math.cos(phi), y: r * Math.sin(phi) }, z });
	}
	return out;
}

/** Even ring of unit in-plane directions with a slight per-seed tilt (ring shell). */
export function ringBurst(n: number, seed: number): BurstDir[] {
	const out: BurstDir[] = [];
	const a0 = hash11(seed) * Math.PI * 2;
	const tilt = 0.03 * (hash11(seed + 1) * 2 - 1);
	for (let i = 0; i < n; i++) {
		const a = a0 + (i / n) * Math.PI * 2;
		out.push({ dir: { x: Math.cos(a), y: Math.sin(a) }, z: tilt * Math.cos(a) });
	}
	return out;
}

/**
 * Classic heart curve, normalized into the unit circle and y-up.
 * `x = 16sin³t`, `y = 13cos t − 5cos 2t − 2cos 3t − cos 4t` — the 17 divisor is
 * the curve's own extent, so the figure fills the shell radius without clipping.
 */
export function heartOutline(t: number): Vec2 {
	const a = t * Math.PI * 2;
	const s = Math.sin(a);
	return {
		x: (16 * s * s * s) / 17,
		y: (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 17,
	};
}

/**
 * A `points`-pointed star walked along its edges (not just its vertices), so a
 * sparse particle count still draws the figure rather than a scatter of tips.
 * `inner` is the valley radius as a fraction of the tip radius.
 */
export function starOutline(points = 5, inner = 0.45): Outline {
	const verts = points * 2;
	return (t: number): Vec2 => {
		const u = ((t % 1) + 1) % 1;
		const scaled = u * verts;
		const i = Math.floor(scaled);
		const f = scaled - i;
		const radiusAt = (k: number) => (k % 2 === 0 ? 1 : inner);
		// Vertices start at the top (−π/2 in y-up math) so a star sits point-up.
		const angleAt = (k: number) => (k / verts) * Math.PI * 2 + Math.PI / 2;
		const a0 = angleAt(i);
		const a1 = angleAt(i + 1);
		const r0 = radiusAt(i);
		const r1 = radiusAt(i + 1);
		const x0 = Math.cos(a0) * r0;
		const y0 = Math.sin(a0) * r0;
		const x1 = Math.cos(a1) * r1;
		const y1 = Math.sin(a1) * r1;
		return { x: lerp(x0, x1, f), y: lerp(y0, y1, f) };
	};
}

/**
 * Cut a burst from a closed unit figure (§3.7). Each direction keeps the
 * outline point's own magnitude, so the spawn speed is proportional to its
 * distance from the centre — under linear drag every spark coasts `v0/drag`,
 * which is what redraws the figure in the sky at `radius` scale.
 *
 * Points are y-up going in and y-down coming out, matching the sim.
 */
export function outlineBurst(n: number, seed: number, outline: Outline, jitter = 0.06): BurstDir[] {
	const out: BurstDir[] = [];
	const phase = hash11(seed) * 0.5;
	for (let i = 0; i < n; i++) {
		// Half-step stagger keeps consecutive shells from sampling identically.
		const t = (i + phase) / n;
		const p = outline(t);
		// Radial jitter only — lateral jitter would fray the outline.
		const j = 1 + (hash11(seed + i * 1.7) * 2 - 1) * jitter;
		out.push({
			dir: { x: p.x * j, y: -p.y * j },
			// A figure is a plane facing the viewer: keep z shallow so the burst
			// reads flat rather than as a sphere wearing the outline.
			z: (hash11(seed + i + 401) * 2 - 1) * 0.12,
		});
	}
	return out;
}

/**
 * Turn caller points into an {@link Outline}: normalized to the unit circle
 * about their own centroid and walked as a closed polygon, so both a sampled
 * curve and a hand-written polygon draw correctly.
 */
export function polygonOutline(points: Vec2[]): Outline {
	if (!points.length) return () => ({ x: 0, y: 0 });
	let cx = 0;
	let cy = 0;
	for (const p of points) {
		cx += p.x;
		cy += p.y;
	}
	cx /= points.length;
	cy /= points.length;
	let max = 0;
	const centered = points.map((p) => {
		const v = { x: p.x - cx, y: p.y - cy };
		max = Math.max(max, Math.hypot(v.x, v.y));
		return v;
	});
	const scale = max > 1e-6 ? 1 / max : 1;
	const n = centered.length;
	return (t: number): Vec2 => {
		const u = ((t % 1) + 1) % 1;
		const scaled = u * n;
		const i = Math.floor(scaled);
		const f = scaled - i;
		const a = centered[i % n];
		const b = centered[(i + 1) % n];
		return { x: lerp(a.x, b.x, f) * scale, y: lerp(a.y, b.y, f) * scale };
	};
}

/** Upward-biased, vertically compressed sphere (willow droop before gravity). */
export function willowBurst(n: number, seed: number): BurstDir[] {
	return sphereBurst(n, seed).map((d) => ({
		dir: { x: d.dir.x, y: d.dir.y * 0.55 - 0.15 },
		z: d.z * 0.7,
	}));
}

/**
 * One semi-implicit Euler step of a damped spring toward `target`.
 * a = −ω²(p−target) − 2ζω·v (§5.2). Stable for the seeker's ω=6, ζ=0.9 at
 * dt up to 33 ms.
 */
export function springStep(
	pos: number,
	vel: number,
	target: number,
	dt: number,
	omega: number,
	zeta: number
): { pos: number; vel: number } {
	const a = -omega * omega * (pos - target) - 2 * zeta * omega * vel;
	const v = vel + a * dt;
	return { pos: pos + v * dt, vel: v };
}

/**
 * Ping-pong index over 0..3 (§1). Returns the current index, then advances,
 * reflecting at the ends: 0,1,2,3,2,1,0,1,…
 */
export function nextShellHue(state: { i: number; dir: 1 | -1 }): number {
	const cur = state.i;
	let ni = state.i + state.dir;
	if (ni > 3) {
		state.dir = -1;
		ni = state.i - 1;
	} else if (ni < 0) {
		state.dir = 1;
		ni = state.i + 1;
	}
	state.i = ni;
	return cur;
}

/** Palette color at a ping-pong index, jittered ±`jitterDeg` in oklab hue. */
export function shellHueColor(
	hueIndex: number,
	palette: Rgb[],
	jitterDeg: number,
	rng: () => number
): Rgb {
	const base = palette[((hueIndex % palette.length) + palette.length) % palette.length];
	const deg = (rng() * 2 - 1) * jitterDeg;
	return hueRotate(base, deg);
}

/**
 * Spark color at life fraction (§1.3 / §3.1): pure white → hue crossfade →
 * full hue → cool warm-white. `whiteHold` is the life fraction the white core
 * holds before crossfading; `seed` adds a small deterministic hue jitter.
 */
export function sparkColorAtLife(
	shellHue: Rgb,
	lifeT: number,
	whiteHold: number,
	seed: number
): Rgb {
	const out: Rgb = { r: 0, g: 0, b: 0 };
	sparkColorAtLifeInto(shellHue, lifeT, whiteHold, seed, out);
	return out;
}

/**
 * Poisson (exponential) inter-arrival time in ms, clamped to [min,max]. The
 * clamp (rather than truncation) keeps the sampled mean near `meanMs`.
 */
export function poissonIntervalMs(
	meanMs: number,
	rng: () => number,
	clampMin: number,
	clampMax: number
): number {
	const u = rng();
	const x = -meanMs * Math.log(1 - Math.min(0.999999, u));
	return Math.min(clampMax, Math.max(clampMin, x));
}

/** Margin the keep-clear rect is grown by before rejecting an apex (§6). */
export const KEEP_CLEAR_MARGIN = 0.02;

/**
 * Whether `(x, y)` falls inside `rect` grown by `margin`. Exported so callers
 * that derive an apex from a sampled one (e.g. a mirrored double) can re-run
 * the same rejection test rather than assume the transform preserved it.
 */
export function rectExpandedContains(
	rect: Rect,
	x: number,
	y: number,
	margin = KEEP_CLEAR_MARGIN
): boolean {
	return (
		x >= rect.x0 - margin && x <= rect.x1 + margin && y >= rect.y0 - margin && y <= rect.y1 + margin
	);
}

/**
 * Sample an apex from weighted zones (§6). Rejects points inside the expanded
 * keep-clear rect (resampling up to `maxTries`), edge-biases x by depth, and
 * falls back to the zone farthest from the keep-clear center.
 */
export function sampleZone(
	zones: Zone[],
	rng: () => number,
	keepClear: Rect | null,
	maxTries = 8
): { apex: Vec2; depth: number } {
	const total = zones.reduce((s, z) => s + z.weight, 0);
	const pickZone = (): Zone => {
		let t = rng() * total;
		for (const z of zones) {
			t -= z.weight;
			if (t <= 0) return z;
		}
		return zones[zones.length - 1];
	};
	const KEEP_MARGIN = KEEP_CLEAR_MARGIN;

	for (let attempt = 0; attempt < maxTries; attempt++) {
		const z = pickZone();
		let x = z.rect.x0 + rng() * (z.rect.x1 - z.rect.x0);
		const y = z.rect.y0 + rng() * (z.rect.y1 - z.rect.y0);
		const depth = rng();
		// Edge-bias: nudge x toward the zone's nearer outer edge as depth rises,
		// staying within the zone rect so zone weights are preserved.
		const mid = (z.rect.x0 + z.rect.x1) / 2;
		const edge = x < mid ? z.rect.x0 : z.rect.x1;
		x = x + (edge - x) * depth * 0.4;
		if (keepClear && rectExpandedContains(keepClear, x, y, KEEP_MARGIN)) continue;
		return { apex: { x, y }, depth };
	}

	// Fallback: the zone whose center is farthest from the keep-clear center.
	const cc = keepClear
		? { x: (keepClear.x0 + keepClear.x1) / 2, y: (keepClear.y0 + keepClear.y1) / 2 }
		: { x: 0.5, y: 0.5 };
	let best = zones[0];
	let bestD = -1;
	for (const z of zones) {
		const zx = (z.rect.x0 + z.rect.x1) / 2;
		const zy = (z.rect.y0 + z.rect.y1) / 2;
		const d = Math.hypot(zx - cc.x, zy - cc.y);
		if (d > bestD) {
			bestD = d;
			best = z;
		}
	}
	return {
		apex: { x: (best.rect.x0 + best.rect.x1) / 2, y: (best.rect.y0 + best.rect.y1) / 2 },
		depth: rng(),
	};
}

/**
 * SDR soft-knee tone map (§7.2): identity below `knee`, then an asymptotic
 * approach to 1.0 so over-white energy compresses instead of hard-clipping.
 * Shared by the renderers (WGSL / GLSL inline the same formula) and unit-tested
 * here so the ladder has one canonical definition.
 */
export function softKnee(x: number, knee: number): number {
	if (x <= knee) return x;
	const over = x - knee;
	const span = Math.max(1 - knee, 1e-3);
	return knee + span * (1 - Math.exp(-over / span));
}

/**
 * Resolve the effective quality tier for `quality="auto"` (or pass a fixed tier
 * through unchanged). Extracted from the component so the ladder is testable:
 *
 * - an explicit tier ("high"/"mid"/"low") always wins;
 * - a small viewport (min-dim < 480 px) → "low" (covers phones);
 * - a low-power device on the WebGL2 fallback → "low" (weak GPU + modest
 *   CPU/RAM; only ever downgrades the fallback path, never WebGPU);
 * - "webgpu-hdr" → "high"; "webgpu-sdr" → "high" on a retina DPR, else "mid";
 * - the WebGL2 levels ("webgl-p3"/"webgl-sdr") → "mid" (the fallback renderer is
 *   fill-rate bound; "none" is unreachable here — no sim is built without an
 *   engine — but maps to "mid" for completeness).
 */
export function resolveQualityTier(
	requested: "auto" | QualityTier,
	level: FireworksRenderLevel,
	dpr: number,
	minDim: number,
	lowPower = false
): QualityTier {
	if (requested !== "auto") return requested;
	if (minDim > 0 && minDim < 480) return "low";
	const isWebGl = level === "webgl-p3" || level === "webgl-sdr";
	if (lowPower && isWebGl) return "low";
	if (level === "webgpu-hdr") return "high";
	if (level === "webgpu-sdr") return dpr >= 2 ? "high" : "mid";
	return "mid";
}

// =============================================================================
// Adaptive downgrade — a session-sticky, GPU-then-CPU quality ladder
// =============================================================================
//
// The CPU sim has large headroom (benchmarked well under 2 ms/frame at 4k
// particles); the real budget risk is GPU fill-rate on the HDR float path. So
// the ladder sheds GPU cost first (accumulation renderScale 1 → 0.75 → 0.5),
// then CPU/GPU cost (spawn density 1 → 0.66 → 0.4, which shrinks new burst
// particle counts — glyph seekers are driven by explicit points and are never
// scaled, so the intro word stays intact). It only ever downgrades: once a
// notch drops it never returns within the session (no oscillation), matching a
// user who would rather have a stable lower quality than a hunting one.
//
// The pool is fixed-size (capacity is frozen at createSim), so runtime tier
// (capacity) changes are intentionally NOT supported — rebuilding the pool
// mid-show would pop every live particle. Reducing spawn density is the cheap,
// pop-free CPU lever and is what the ladder uses instead.

/** One rung of the adaptive quality ladder. */
export interface AdaptiveLevel {
	/** Accumulation-buffer resolution scale relative to the canvas. */
	renderScale: number;
	/** Multiplier on new burst particle counts (spawn density). */
	spawnScale: number;
}

/** The fixed ladder. Index 0 is full quality; each step sheds more. */
export const ADAPTIVE_LADDER: AdaptiveLevel[] = [
	{ renderScale: 1, spawnScale: 1 }, // 0 — full
	{ renderScale: 0.75, spawnScale: 1 }, // 1 — GPU: 0.75× accum
	{ renderScale: 0.5, spawnScale: 1 }, // 2 — GPU: 0.5× accum
	{ renderScale: 0.5, spawnScale: 0.66 }, // 3 — CPU: 0.66× spawn
	{ renderScale: 0.5, spawnScale: 0.4 }, // 4 — CPU: 0.4× spawn (floor)
];

export interface AdaptiveTuning {
	/** EMA smoothing factor (higher = more reactive). */
	alpha: number;
	/** Frame-time (ms) above which frames count toward a downgrade. */
	thresholdMs: number;
	/** Consecutive over-threshold frames required to drop a notch. */
	sustainFrames: number;
}

/** Defaults: EMA α=0.1, downgrade when the average frame holds > 24 ms (~<42 fps) for ~60 frames (~1 s). */
export const ADAPTIVE_DEFAULTS: AdaptiveTuning = {
	alpha: 0.1,
	thresholdMs: 24,
	sustainFrames: 60,
};

export interface AdaptiveState {
	/** EMA of frame time (ms). */
	emaMs: number;
	/** Consecutive frames the EMA has been over threshold. */
	overCount: number;
	/** Current ladder index (only ever increases). */
	step: number;
	/** Whether the EMA has been seeded (avoids a ramp-up from 0). */
	started: boolean;
}

export function createAdaptiveState(): AdaptiveState {
	return { emaMs: 0, overCount: 0, step: 0, started: false };
}

/**
 * Fold one ACTIVE frame's wall time into the adaptive controller. The caller
 * must invoke this only for frames that actually did work (particles present,
 * not reduced-motion-idle, not `document.hidden`) so paused/quiet frames don't
 * skew the average. Mutates `state` (EMA, counter, step) and returns `true` on
 * the frame a downgrade fires — the caller then applies `adaptiveLevel(state)`.
 * Session-sticky: never upgrades; a no-op once at the ladder floor.
 */
export function adaptiveDowngradeStep(
	state: AdaptiveState,
	frameMs: number,
	tuning: AdaptiveTuning = ADAPTIVE_DEFAULTS
): boolean {
	// Seed on the first active frame so the EMA starts at the real cost.
	if (!state.started) {
		state.emaMs = frameMs;
		state.started = true;
	} else {
		state.emaMs += tuning.alpha * (frameMs - state.emaMs);
	}

	// At the floor there is nothing left to shed.
	if (state.step >= ADAPTIVE_LADDER.length - 1) {
		state.overCount = 0;
		return false;
	}

	if (state.emaMs > tuning.thresholdMs) {
		state.overCount++;
		if (state.overCount >= tuning.sustainFrames) {
			state.step++;
			state.overCount = 0; // give the new level time to take effect
			return true;
		}
	} else {
		state.overCount = 0;
	}
	return false;
}

/** The current ladder rung for `state.step`. */
export function adaptiveLevel(state: AdaptiveState): AdaptiveLevel {
	return ADAPTIVE_LADDER[Math.min(state.step, ADAPTIVE_LADDER.length - 1)];
}

// =============================================================================
// §1 factory — createSim
// =============================================================================

interface LaunchSpec {
	shell: ShellKind;
	colors: Rgb[]; // one or two hues
	/** Ascent-trail hue for this shell (comet head mixed toward `colors[0]`). */
	trailHue: Rgb;
	scale: number;
	depth: number;
	seed: number;
	intensity: Intensity;
	glyphPoints?: Vec2[];
	/** Resolved figure for a pattern shell (built once per launch). */
	outline?: Outline;
	releaseAtMs?: number;
	breakMs: number;
}

type BurstReq = { origin: Vec2; spec: LaunchSpec };
type FlashReq = { pos: Vec2; brightness: number; size: number; hue: Rgb; dim?: number };
type SparkReq = {
	pos: Vec2;
	vel: Vec2;
	ttl: number;
	size: number;
	hue: Rgb;
	seed: number;
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rand = (rng: () => number, lo: number, hi: number) => lo + rng() * (hi - lo);

export function createSim(opts: SimOptions): Sim {
	const tier = QUALITY[opts.quality];
	const capacity = tier.maxParticles;
	const palette = opts.palette ?? PALETTE;
	const rng = opts.rng ?? Math.random;

	const pool = new Float32Array(capacity * STRIDE);
	let count = 0;
	let droppedSpawns = 0;
	let aspect = opts.aspect;
	// §4.5 soft-dim rect. Null until the caller sets it (the app only does so
	// once the card is on screen), so the intro glyph is never dimmed.
	let keepClear: Rect | null = null;
	// Adaptive spawn-density lever (1 = full). Scales new burst counts only.
	let spawnScale = 1;

	// Session wind (seeded once). `a += w · windScale[type]` each step.
	const sessionWind: Vec2 = opts.wind ?? {
		x: (rng() < 0.5 ? -1 : 1) * rand(rng, WIND_X[0], WIND_X[1]),
		y: (rng() < 0.5 ? -1 : 1) * rand(rng, WIND_Y[0], WIND_Y[1]),
	};

	// Deferred spawns: enqueued during step (detonations, flashes, trail sparks),
	// drained at the top of the NEXT step so the pool is never grown mid-iterate.
	let burstQueue: BurstReq[] = [];
	let flashQueue: FlashReq[] = [];
	let sparkQueue: SparkReq[] = [];

	// Monotonic seed for step-time randomness that has no stored particle seed
	// (keeps determinism: a fixed call order reproduces the same sequence).
	let seq = 1;
	const stepSeed = () => hash11(seq++ * 0.61803398875);

	function appendParticle(write: (base: number) => void): boolean {
		if (count >= capacity) {
			droppedSpawns++;
			return false;
		}
		const base = count * STRIDE;
		// Zero the slot so unset fields are deterministic.
		for (let k = 0; k < STRIDE; k++) pool[base + k] = 0;
		// Depth dim is a multiplier, so its neutral value is 1, not 0. Set before
		// the writer runs so depth-aware spawns can still override it.
		pool[base + F.depthDim] = 1;
		write(base);
		count++;
		return true;
	}

	function setAspect(a: number) {
		aspect = a;
	}

	function setKeepClear(rect: Rect | null) {
		keepClear = rect;
	}

	function setSpawnScale(scale: number) {
		spawnScale = Number.isFinite(scale) ? Math.max(0, Math.min(1, scale)) : 1;
	}

	function reset() {
		count = 0;
		droppedSpawns = 0;
		burstQueue = [];
		flashQueue = [];
		sparkQueue = [];
		seq = 1;
	}

	// ---- launch (§4) --------------------------------------------------------
	function launch(o: LaunchOptions): LaunchResult {
		const shell = o.shell ?? "peony";
		const seed = o.seed ?? Math.floor(rng() * 1e6);
		const from: Vec2 = o.from ?? {
			x: clamp(o.apex.x + (rng() * 2 - 1) * 0.04, LAUNCH_X[0], LAUNCH_X[1]),
			y: rand(rng, LAUNCH_Y[0], LAUNCH_Y[1]),
		};
		// Solve against the medium the rocket is actually integrated through
		// (drag, session wind, aspect) — a ballistic solve undershoots the apex by
		// ~25% of the rise and misses horizontally on non-square canvases.
		const { v0, flightMs } = solveLaunch(from, o.apex, G * GRAV_SCALE[TYPE.ROCKET], o.flightMs, {
			drag: DRAG[TYPE.ROCKET],
			aspect,
			windX: sessionWind.x * WIND_SCALE[TYPE.ROCKET],
			windY: sessionWind.y * WIND_SCALE[TYPE.ROCKET],
		});
		// Fuse hang 80–140 ms (intro glyph "?" uses 140 via explicit releaseAtMs path).
		const hangMs = o.intensity === "intro" ? 140 : rand(rng, 80, 140);
		const breakMs = flightMs + hangMs;

		const colors = resolveColors(o.color, seed);
		const spec: LaunchSpec = {
			shell,
			colors,
			// The ascent trail is tinted toward THIS shell's hue (§4) — mixed once
			// per launch, not per emitted spark, and never from the default palette.
			trailHue: mixOklab(COMET_HEAD, colors[0], COMET_TRAIL_MIX),
			scale: o.scale ?? 1,
			depth: clamp(o.depth ?? 0, 0, 1),
			seed,
			intensity: o.intensity ?? "ambient",
			glyphPoints: o.glyphPoints,
			// Resolved here, not per particle: normalizing the caller's points is
			// O(n) and the burst is expanded a frame later, once.
			outline: o.shapePoints?.length ? polygonOutline(o.shapePoints) : undefined,
			releaseAtMs: o.releaseAtMs,
			breakMs,
		};
		const launchId = registerSpec(spec);

		appendParticle((base) => {
			pool[base + F.posX] = from.x;
			pool[base + F.posY] = from.y;
			pool[base + F.velX] = v0.x;
			pool[base + F.velY] = v0.y;
			pool[base + F.ttl] = breakMs / 1000;
			pool[base + F.size] = 0.004;
			pool[base + F.r] = COMET_HEAD.r;
			pool[base + F.g] = COMET_HEAD.g;
			pool[base + F.b] = COMET_HEAD.b;
			pool[base + F.brightness] = B_ASCENT_HEAD;
			pool[base + F.type] = TYPE.ROCKET;
			pool[base + F.seed] = seed;
			// Field reuse for rockets: targetX = launchId, targetY = trail accumulator.
			pool[base + F.targetX] = launchId;
			pool[base + F.targetY] = 0;
			pool[base + F.dragScale] = 1;
		});

		return { flightMs, breakMs };
	}

	function resolveColors(color: Rgb | Rgb[] | undefined, seed: number): Rgb[] {
		if (Array.isArray(color)) return color.length ? color : [PALETTE[0]];
		if (color) return [color];
		// Omitted → ping-pong sweep seeded off the launch seed (deterministic).
		const idx = Math.floor(hash11(seed) * palette.length) % palette.length;
		return [hueRotate(palette[idx], (hash11(seed + 7) * 2 - 1) * SHELL_JITTER_DEG)];
	}

	// Active launch specs by id (freed at detonation). Tiny (≤ a few at once).
	const specs = new Map<number, LaunchSpec>();
	let specId = 1;
	function registerSpec(spec: LaunchSpec): number {
		const id = specId++;
		specs.set(id, spec);
		return id;
	}

	function spawnFlash(pos: Vec2, brightness: number, sizeNorm: number, hue: Rgb): void {
		flashQueue.push({ pos: { ...pos }, brightness, size: sizeNorm, hue });
	}

	// ---- detonation → burst expansion --------------------------------------
	function expandBurst(req: BurstReq) {
		const { origin, spec } = req;
		const recipe = SHELL[spec.shell];
		if (spec.shell === "glyph") {
			expandGlyph(origin, spec);
			return;
		}
		// Spawn-density lever (adaptive downgrade): scale burst counts, floor at 1.
		const n = Math.max(1, Math.round(recipe.counts[opts.quality] * spawnScale));
		// Depth also pulls the burst in spatially, so a far shell is a smaller
		// bloom and not just a desaturated one at full size.
		const radius =
			rand(seededRng(spec.seed + 3), recipe.radius[0], recipe.radius[1]) *
			spec.scale *
			(1 - DEPTH_RADIUS * spec.depth);
		const dim = depthDim(spec.depth);
		const baseSpeed = radius * BURST_SPEED_K;
		const outline = spec.outline ?? recipe.outline;
		let dirs: BurstDir[];
		if (recipe.builder === "outline") {
			// A "shape" shell launched without points has no figure to draw; fall
			// back to a plain sphere so the shell still breaks instead of vanishing.
			dirs = outline ? outlineBurst(n, spec.seed, outline) : sphereBurst(n, spec.seed);
		} else if (recipe.builder === "ring") {
			dirs = ringBurst(n, spec.seed);
		} else if (recipe.builder === "willow") {
			dirs = willowBurst(n, spec.seed);
		} else {
			dirs = sphereBurst(n, spec.seed);
		}

		for (let i = 0; i < dirs.length; i++) {
			const { dir, z } = dirs[i];
			// Break asymmetry ±12% and 5% stragglers ×1.4 speed / dragScale×0.7.
			// A pattern shell keeps neither: both are read as a broken figure.
			const asymAmount = recipe.crisp ? 0.03 : 0.12;
			const asym = 1 + (hash11(spec.seed + i) * 2 - 1) * asymAmount;
			const straggler = !recipe.crisp && hash11(spec.seed + i + 991) < 0.05;
			const speed = baseSpeed * asym * (straggler ? 1.4 : 1);
			const isEmber = hash11(spec.seed + i + 313) < recipe.emberFrac;
			const type: ParticleType = isEmber ? TYPE.EMBER : TYPE.SPARK;
			const crackles = !isEmber && hash11(spec.seed + i + 577) < CRACKLE_FRAC;
			const hue = depthAdjust(pickShellColor(spec, i), spec.depth);
			const ttl = isEmber
				? rand(seededRng(spec.seed + i + 17), 1.4, 2.4)
				: rand(seededRng(spec.seed + i + 17), 0.75, 1.3);
			const size =
				(isEmber
					? rand(seededRng(spec.seed + i + 29), 0.002, 0.003)
					: rand(seededRng(spec.seed + i + 29), 0.0025, 0.004)) *
				(1 - DEPTH_SIZE * spec.depth);
			appendParticle((base) => {
				pool[base + F.posX] = origin.x;
				pool[base + F.posY] = origin.y;
				pool[base + F.velX] = dir.x * speed;
				pool[base + F.velY] = dir.y * speed;
				pool[base + F.ttl] = ttl;
				pool[base + F.size] = size;
				pool[base + F.r] = hue.r;
				pool[base + F.g] = hue.g;
				pool[base + F.b] = hue.b;
				pool[base + F.brightness] = B_SPARK_FRESH;
				pool[base + F.type] = type;
				pool[base + F.seed] = spec.seed + i;
				// z-parallax folded into dragScale as a mild size/brightness proxy is
				// avoided; dragScale carries the straggler multiplier and a per-spark
				// spread — identical drag makes every spark fall at one speed, which
				// combs the debris into a parallel curtain instead of a shell.
				pool[base + F.dragScale] = straggler ? 0.7 : 0.85 + 0.45 * hash11(spec.seed + i + 233);
				pool[base + F.depthDim] = dim;
				// Field reuse for sparks: targetX flags the cracklers.
				pool[base + F.targetX] = crackles ? 1 : 0;
				// Stash burst z in targetY (unused for sparks/embers) for future
				// parallax; harmless if ignored by the renderer.
				pool[base + F.targetY] = z;
			});
		}

		// Apex smoke puff(s) + one detonation flash.
		for (let s = 0; s < recipe.smoke; s++) {
			spawnSmoke(origin, spec, s);
		}
		const flashB = spec.intensity === "intro" ? B_FLASH_INTRO : B_FLASH_AMBIENT;
		flashQueue.push({
			pos: { ...origin },
			brightness: flashB,
			size: rand(seededRng(spec.seed + 5), 0.025, 0.05) * (1 - DEPTH_SIZE * spec.depth),
			hue: depthAdjust(spec.colors[0], spec.depth),
			dim,
		});
	}

	function expandGlyph(origin: Vec2, spec: LaunchSpec) {
		const points = spec.glyphPoints ?? [];
		const releaseDelaySec = Math.max(
			0.3,
			((spec.releaseAtMs ?? spec.breakMs + 1500) - spec.breakMs) / 1000
		);
		const hue = depthAdjust(spec.colors[0], spec.depth);
		const dim = depthDim(spec.depth);
		for (let i = 0; i < points.length; i++) {
			const p = points[i];
			appendParticle((base) => {
				pool[base + F.posX] = origin.x;
				pool[base + F.posY] = origin.y;
				// Pop velocity toward target, magnitude dist/0.08 (§5.1).
				const dx = (p.x - origin.x) * aspect;
				const dy = p.y - origin.y;
				const d = Math.hypot(dx, dy) || 1e-4;
				const mag = d / 0.08;
				pool[base + F.velX] = (dx / d) * mag;
				pool[base + F.velY] = (dy / d) * mag;
				pool[base + F.ttl] = releaseDelaySec + 0.9; // hold window + release fade
				pool[base + F.size] = 0.003 * (1 - DEPTH_SIZE * spec.depth);
				pool[base + F.depthDim] = dim;
				pool[base + F.r] = hue.r;
				pool[base + F.g] = hue.g;
				pool[base + F.b] = hue.b;
				pool[base + F.brightness] = B_GLYPH_HOLD;
				pool[base + F.type] = TYPE.SEEKER;
				pool[base + F.seed] = spec.seed + i;
				pool[base + F.targetX] = p.x;
				pool[base + F.targetY] = p.y;
				// Field reuse for seekers: dragScale carries the release delay (s).
				pool[base + F.dragScale] = releaseDelaySec;
			});
		}
	}

	function spawnSmoke(origin: Vec2, spec: LaunchSpec, s: number) {
		appendParticle((base) => {
			pool[base + F.posX] = origin.x + (hash11(spec.seed + s + 41) * 2 - 1) * 0.01;
			pool[base + F.posY] = origin.y + (hash11(spec.seed + s + 43) * 2 - 1) * 0.01;
			pool[base + F.velX] = (hash11(spec.seed + s + 47) * 2 - 1) * 0.02;
			pool[base + F.velY] = -0.02;
			pool[base + F.ttl] = rand(seededRng(spec.seed + s + 51), 1.5, 3.0);
			pool[base + F.size] = 0.01;
			pool[base + F.r] = SMOKE_COLOR.r;
			pool[base + F.g] = SMOKE_COLOR.g;
			pool[base + F.b] = SMOKE_COLOR.b;
			pool[base + F.brightness] = B_SMOKE_MIN;
			pool[base + F.type] = TYPE.SMOKE;
			pool[base + F.seed] = spec.seed + s + 61;
			pool[base + F.dragScale] = 1;
			pool[base + F.depthDim] = depthDim(spec.depth);
		});
	}

	function pickShellColor(spec: LaunchSpec, i: number): Rgb {
		if (spec.colors.length === 1) return spec.colors[0];
		// Adjacent duo: split the shell between the two hues.
		return hash11(spec.seed + i + 137) < 0.5 ? spec.colors[0] : spec.colors[1];
	}

	function depthAdjust(hue: Rgb, depth: number): Rgb {
		if (depth <= 0) return hue;
		return scaleChroma(hue, 1 - DEPTH_CHROMA * depth);
	}

	/** Brightness multiplier a launch's `depth` imposes on all of its debris. */
	function depthDim(depth: number): number {
		return depth <= 0 ? 1 : 1 - DEPTH_DIM * depth;
	}

	// A small deterministic rng seeded off an integer, for spawn-time jitter
	// during a detonation (which happens inside step and must stay reproducible).
	function seededRng(seed: number): () => number {
		let s = seed;
		return () => {
			s += 1;
			return hash11(s);
		};
	}

	// ---- step (§7) ----------------------------------------------------------
	function step(dtSeconds: number, wind?: Vec2) {
		const dt = Math.min(dtSeconds, DT_MAX);
		const w = wind ?? sessionWind;

		// 2. Drain the previous frame's deferred spawns.
		if (burstQueue.length) {
			const q = burstQueue;
			burstQueue = [];
			for (let bi = 0; bi < q.length; bi++) expandBurst(q[bi]);
		}
		if (flashQueue.length) {
			const q = flashQueue;
			flashQueue = [];
			for (let fi = 0; fi < q.length; fi++) {
				const f = q[fi];
				appendParticle((base) => {
					pool[base + F.posX] = f.pos.x;
					pool[base + F.posY] = f.pos.y;
					pool[base + F.ttl] = rand(seededRng(seq++ | 0), 0.06, 0.12);
					pool[base + F.size] = f.size;
					pool[base + F.r] = f.hue.r;
					pool[base + F.g] = f.hue.g;
					pool[base + F.b] = f.hue.b;
					pool[base + F.brightness] = f.brightness;
					pool[base + F.type] = TYPE.FLASH;
					pool[base + F.seed] = stepSeed() * 1000;
					pool[base + F.depthDim] = f.dim ?? 1;
				});
			}
		}
		if (sparkQueue.length) {
			const q = sparkQueue;
			sparkQueue = [];
			for (let si = 0; si < q.length; si++) {
				const sp = q[si];
				appendParticle((base) => {
					pool[base + F.posX] = sp.pos.x;
					pool[base + F.posY] = sp.pos.y;
					pool[base + F.velX] = sp.vel.x;
					pool[base + F.velY] = sp.vel.y;
					pool[base + F.ttl] = sp.ttl;
					pool[base + F.size] = sp.size;
					pool[base + F.r] = sp.hue.r;
					pool[base + F.g] = sp.hue.g;
					pool[base + F.b] = sp.hue.b;
					pool[base + F.brightness] = B_ASCENT_TAIL;
					pool[base + F.type] = TYPE.SPARK;
					pool[base + F.seed] = sp.seed;
					pool[base + F.dragScale] = 1;
				});
			}
		}

		// 3. Per-live update with swap-remove (re-examine i after a removal). Aging
		// happens exactly once per particle here; type routines only integrate.
		let i = 0;
		while (i < count) {
			const base = i * STRIDE;
			const type = pool[base + F.type] as ParticleType;

			if (type === TYPE.ROCKET) {
				emitTrail(base, dt);
				integrate(base, type, dt, w);
				// Ascent wobble: a real shell corkscrews slightly on its way up, and
				// the perfectly straight column the integrator draws reads as a wire.
				// Positional only (velocity untouched), and small enough that the
				// apex the launch solved for still holds.
				const wob = pool[base + F.seed];
				pool[base + F.posX] +=
					Math.sin(pool[base + F.age] * ROCKET_WOBBLE_HZ + hash11(wob) * 6.283) *
					ROCKET_WOBBLE_AMP *
					dt;
			} else if (type === TYPE.SEEKER) {
				stepSeeker(base, dt);
			} else {
				integrate(base, type, dt, w);
				if (type === TYPE.SMOKE) stepSmoke(base, dt);
			}

			pool[base + F.age] += dt;
			const lifeT = pool[base + F.ttl] > 0 ? pool[base + F.age] / pool[base + F.ttl] : 1;
			// The launch's depth rides along as a per-particle multiplier: the type
			// curves stay the single source of the shape, depth only scales it.
			pool[base + F.brightness] =
				brightnessCurve(type, base, lifeT) * deathGate(lifeT) * pool[base + F.depthDim];

			// §4.5 soft-dim: drift-ins behind the card fade to KEEP_CLEAR_DIM so the
			// haze there stays under the §4.6 ceiling (this brightness feeds the
			// additive accumulation write in writeInstances). Rockets transit and
			// glyph seekers are the show — both exempt — and the branch only runs
			// once a keep-clear rect is set.
			if (keepClear !== null && type !== TYPE.ROCKET && type !== TYPE.SEEKER) {
				const px = pool[base + F.posX];
				const py = pool[base + F.posY];
				if (px >= keepClear.x0 && px <= keepClear.x1 && py >= keepClear.y0 && py <= keepClear.y1) {
					pool[base + F.brightness] *= KEEP_CLEAR_DIM;
				}
			}

			let removed = false;
			if (lifeT >= 1) {
				// A rocket reaching its ttl detonates: enqueue the shell at the head's
				// current position (drained next frame), then die like any particle.
				if (type === TYPE.ROCKET) {
					const spec = specs.get(pool[base + F.targetX]);
					if (spec) {
						burstQueue.push({
							origin: { x: pool[base + F.posX], y: pool[base + F.posY] },
							spec,
						});
						specs.delete(pool[base + F.targetX]);
					}
				}
				removed = true;
			}

			if (removed) {
				// Swap-remove: copy the last live particle into slot i, shrink, and
				// re-examine i (do not advance).
				const last = (count - 1) * STRIDE;
				if (base !== last) pool.copyWithin(base, last, last + STRIDE);
				count--;
			} else {
				i++;
			}
		}
	}

	// Generic semi-implicit Euler with per-type gravity, wind, and drag (§2.1).
	function integrate(base: number, type: ParticleType, dt: number, w: Vec2) {
		const ax = w.x * WIND_SCALE[type];
		const ay = G * GRAV_SCALE[type] + w.y * WIND_SCALE[type];
		let vx = pool[base + F.velX] + ax * dt;
		let vy = pool[base + F.velY] + ay * dt;
		const damp = 1 + DRAG[type] * pool[base + F.dragScale] * dt;
		vx /= damp;
		vy /= damp;
		pool[base + F.velX] = vx;
		pool[base + F.velY] = vy;
		pool[base + F.posX] += (vx / aspect) * dt;
		pool[base + F.posY] += vy * dt;
	}

	// Rocket ascent trail (§4): fractional accumulator in targetY, deferred
	// spawns so the pool is never grown while the per-live loop iterates.
	function emitTrail(base: number, dt: number) {
		let emit = pool[base + F.targetY] + tier.trailRate * dt;
		const seed = pool[base + F.seed];
		const px = pool[base + F.posX];
		const py = pool[base + F.posY];
		// targetX carries the launch id: the trail wears the launched shell's hue.
		const hue = specs.get(pool[base + F.targetX])?.trailHue ?? COMET_TRAIL_HUE;
		let k = 0;
		while (emit >= 1) {
			emit -= 1;
			const j = hash11(seed + pool[base + F.age] * 1000 + k);
			sparkQueue.push({
				pos: { x: px, y: py },
				// Wider lateral scatter: a rigidly co-linear trail reads as a drawn
				// beam rather than a comet shedding sparks.
				vel: { x: (j * 2 - 1) * 0.035, y: (hash11(j) * 2 - 1) * 0.02 },
				ttl: rand(seededRng(seed + k + 71), 0.22, 0.45),
				size: 0.0018,
				hue,
				seed: seed + k + 500,
			});
			k++;
		}
		pool[base + F.targetY] = emit;
	}

	function stepSeeker(base: number, dt: number) {
		const age = pool[base + F.age];
		const releaseDelay = pool[base + F.dragScale];
		const tX = pool[base + F.targetX];
		const tY = pool[base + F.targetY];
		const seed = pool[base + F.seed];

		if (age < 0.08) {
			// Pop phase: ballistic toward target, mild drag, no gravity (§5.1).
			let vx = pool[base + F.velX];
			let vy = pool[base + F.velY];
			const damp = 1 + DRAG[TYPE.SEEKER] * dt;
			vx /= damp;
			vy /= damp;
			pool[base + F.velX] = vx;
			pool[base + F.velY] = vy;
			pool[base + F.posX] += (vx / aspect) * dt;
			pool[base + F.posY] += vy * dt;
		} else if (age < releaseDelay) {
			// Spring phase, per axis in VISUAL units (errX = (targetX−posX)·A).
			// Inlined from springStep (a = −ω²(p−target) − 2ζω·v; v += a·dt;
			// p += v·dt) with ω=6, ζ=0.9 so the held-glyph hot loop mints no
			// per-seeker objects. Kept byte-identical to springStep.
			const omega = 6;
			const zeta = 0.9;
			const px = pool[base + F.posX] * aspect;
			const ax = -omega * omega * (px - tX * aspect) - 2 * zeta * omega * pool[base + F.velX];
			const nvx = pool[base + F.velX] + ax * dt;
			pool[base + F.velX] = nvx;
			pool[base + F.posX] = (px + nvx * dt) / aspect;
			const py = pool[base + F.posY];
			const ay = -omega * omega * (py - tY) - 2 * zeta * omega * pool[base + F.velY];
			const nvy = pool[base + F.velY] + ay * dt;
			pool[base + F.velY] = nvy;
			pool[base + F.posY] = py + nvy * dt;
		} else {
			// Release phase: spring off, gravity on, ballistic fall.
			const vy = pool[base + F.velY] + G * 1.0 * dt;
			pool[base + F.velY] = vy;
			pool[base + F.posX] += (pool[base + F.velX] / aspect) * dt;
			pool[base + F.posY] += vy * dt;
		}
	}

	function stepSmoke(base: number, _dt: number) {
		// Two-stage expand: grow size toward 0.05 over life (§2.2 / §3.5).
		const lifeT = pool[base + F.ttl] > 0 ? pool[base + F.age] / pool[base + F.ttl] : 1;
		pool[base + F.size] = lerp(0.01, 0.05, Math.min(1, lifeT));
	}

	function brightnessCurve(type: ParticleType, base: number, lifeT: number): number {
		const seed = pool[base + F.seed];
		const age = pool[base + F.age];
		switch (type) {
			case TYPE.FLASH:
				// Steep decay: the flash marks the break, it must not sit on top of
				// the shell as a white disc while the sparks are opening.
				return pool[base + F.brightness] > 0
					? Math.max(pool[base + F.brightness], B_FLASH_AMBIENT) * Math.exp(-5.5 * lifeT)
					: B_FLASH_AMBIENT * Math.exp(-5.5 * lifeT);
			case TYPE.SPARK: {
				// Two-stage: fast drop 2.2→~0.9, then cubic ease-in to 0 past 0.7.
				let b = B_SPARK_STEADY + (B_SPARK_FRESH - B_SPARK_STEADY) * Math.exp(-lifeT * 8);
				if (lifeT > 0.7) {
					const u = (lifeT - 0.7) / 0.3;
					b = Math.max(B_SPARK_TERMINAL, b * (1 - u) * (1 - u) * (1 - u));
				}
				// Crackle: flagged sparks chatter on/off at CRACKLE_HZ instead of
				// fading smoothly (field reuse — targetX is free for sparks).
				if (pool[base + F.targetX] > 0.5) {
					b *= flickerNoise(seed, age, CRACKLE_HZ) > 0.5 ? 1.9 : 0.25;
				}
				return b;
			}
			case TYPE.EMBER: {
				// Irregular flicker 8–14 Hz, ×0.6–2.0, over a slow near-linear fade.
				const freq = 8 + 6 * hash11(seed);
				const mul = 0.6 + 1.4 * flickerNoise(seed, age, freq);
				return B_EMBER_MEAN * mul * (1 - 0.6 * lifeT);
			}
			case TYPE.SMOKE:
				// Rise then fall within the haze ceiling.
				return lerp(B_SMOKE_MIN, B_SMOKE_MAX, Math.sin(Math.min(1, lifeT) * Math.PI));
			case TYPE.SEEKER: {
				const releaseDelay = pool[base + F.dragScale];
				if (age < releaseDelay) {
					return B_GLYPH_HOLD * (0.85 + 0.3 * flickerNoise(seed, age, 10));
				}
				// Release pop then decay.
				const rt = (age - releaseDelay) / 0.9;
				return B_GLYPH_RELEASE * Math.exp(-3 * Math.max(0, rt));
			}
			case TYPE.ROCKET:
			default:
				return B_ASCENT_HEAD;
		}
	}

	// ---- writeInstances (§7) -----------------------------------------------
	// Per-sim display scratch: `_dispHue` holds the raw pool hue, `_dispColor`
	// the resolved display color. Reused every particle every frame so the hot
	// loop mints zero objects.
	const _dispHue: Rgb = { r: 0, g: 0, b: 0 };
	const _dispColor: Rgb = { r: 0, g: 0, b: 0 };

	function writeInstances(out: Float32Array): number {
		let n = 0;
		for (let idx = 0; idx < count; idx++) {
			const base = idx * STRIDE;
			const type = pool[base + F.type] as ParticleType;
			const bright = pool[base + F.brightness];
			const lifeT = pool[base + F.ttl] > 0 ? pool[base + F.age] / pool[base + F.ttl] : 1;
			displayColorInto(type, base, lifeT, _dispColor);
			const o = n * 8;
			out[o + 0] = pool[base + F.posX];
			out[o + 1] = pool[base + F.posY];
			out[o + 2] = pool[base + F.size];
			out[o + 3] = _dispColor.r * bright;
			out[o + 4] = _dispColor.g * bright;
			out[o + 5] = _dispColor.b * bright;
			out[o + 6] = pool[base + F.velX] * STRETCH;
			out[o + 7] = pool[base + F.velY] * STRETCH;
			n++;
		}
		return n;
	}

	// Resolve a particle's display color into `out` (no allocation). `out` must
	// not alias `_dispHue`.
	function displayColorInto(type: ParticleType, base: number, lifeT: number, out: Rgb): void {
		_dispHue.r = pool[base + F.r];
		_dispHue.g = pool[base + F.g];
		_dispHue.b = pool[base + F.b];
		const seed = pool[base + F.seed];
		switch (type) {
			case TYPE.SPARK: {
				const whiteHold = 0.04 + 0.07 * hash11(seed);
				sparkColorAtLifeInto(_dispHue, lifeT, whiteHold, seed, out);
				return;
			}
			case TYPE.EMBER:
				// Cool toward warm-white only as it dims (§1.7).
				mixOklabInto(_dispHue, COOL_END, Math.min(1, lifeT) * 0.5, out);
				return;
			case TYPE.FLASH:
				// White core crossfading to hue as it decays (§3.2).
				mixOklabInto(MAGNESIUM, _dispHue, Math.min(1, lifeT), out);
				return;
			case TYPE.SMOKE:
				out.r = SMOKE_COLOR.r;
				out.g = SMOKE_COLOR.g;
				out.b = SMOKE_COLOR.b;
				return;
			case TYPE.SEEKER:
			case TYPE.ROCKET:
			default:
				out.r = _dispHue.r;
				out.g = _dispHue.g;
				out.b = _dispHue.b;
				return;
		}
	}

	return {
		launch,
		spawnFlash,
		step,
		writeInstances,
		setAspect,
		setKeepClear,
		setSpawnScale,
		reset,
		get count() {
			return count;
		},
		get capacity() {
			return capacity;
		},
		get droppedSpawns() {
			return droppedSpawns;
		},
		get data() {
			return pool;
		},
	};
}
