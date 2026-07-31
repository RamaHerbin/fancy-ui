/**
 * Single source of truth for the synthwave landing scene: layer order, geometry
 * anchors, color tokens, parallax amplitudes, asset naming, animation timings,
 * and the Svelte context the scene root shares with its layer components.
 *
 * Nothing here touches the DOM, so layers and tests can import it freely.
 * Layers import ONLY this module — never each other.
 *
 * The scene is art-directed against a fixed reference mock; every geometry
 * number below is measured from it. Percentages are of the scene frame (the
 * host section's box) unless a comment says otherwise.
 */
import { getContext, setContext } from "svelte";
import type { gsap } from "gsap";

/* ------------------------------------------------------------------------- *
 * Horizon
 * ------------------------------------------------------------------------- */

/**
 * The horizon line, in % of frame height from the top. One number shared by
 * every layer that meets it: the sky gradient's brightest stop, the mountain
 * ridge bases, the city base, and the grid floor's top edge all sit exactly
 * here. Layers inject it into their CSS via an inline style
 * (`style={`--horizon: ${SCENE_HORIZON_PCT}%`}`) so no layer hardcodes its own
 * copy — the old scene drifted between 48% and 52% and the seams showed.
 */
export const SCENE_HORIZON_PCT = 57.4;

/* ------------------------------------------------------------------------- *
 * Layer order and parallax
 * ------------------------------------------------------------------------- */

export interface SceneLayer {
	/** Stable identifier. Used as the `data-layer` attribute and component-map key. */
	id: string;
	/**
	 * Distance from the viewer: 0 = infinitely far (never moves), 1 = closest
	 * (moves the full PARALLAX_MAX_* amplitude). Purely a motion value — stacking
	 * comes from the array order below, never from depth.
	 */
	depth: number;
	/**
	 * Parallax amplitude override, on the same 0..1 scale as `depth`. Only needed
	 * when a layer's stacking position and its motion disagree: the atmosphere
	 * sits in front of everything yet must barely move, and the sun draws in
	 * front of the mountains yet is the most distant thing in the sky.
	 */
	parallax?: number;
	/**
	 * Vertical-only amplitude override, on the same 0..1 scale as `depth`. Falls
	 * back to `parallax`, then `depth`. See `HORIZON_PARALLAX_Y`.
	 */
	parallaxY?: number;
}

/**
 * Vertical amplitude shared by every layer that meets the horizon or stands on
 * the floor. Vertical shear is what breaks a contact point: the ridge lifting
 * off the horizon line, or the car floating above the grid cell it is parked
 * on, reads as broken, where the exact same slide sideways reads as depth. So
 * the whole horizon-and-floor group travels as one vertically and fans out
 * only horizontally.
 */
const HORIZON_PARALLAX_Y = 0.3;

/**
 * Back-to-front. `SynthwaveScene` renders wrappers in exactly this order, so
 * DOM order is the z-order and no layer ever carries a z-index.
 *
 * Deliberate order decisions (this array is the one stacking authority):
 *
 * - `sun` draws IN FRONT of `mountains-far`. Physically wrong, visually right:
 *   the mock shows the full striped disc sinking through the horizon, and with
 *   the ridge in front the disc lost its bottom half and read as a dome. The
 *   disc's below-horizon slice is then swallowed gradually by the grid floor's
 *   semi-transparent top gradient (grid stacks later), which is what makes it
 *   "melt" into the floor instead of being cut by a hard edge.
 * - `sun.parallax` is overridden low: it stacks in front of the ridge but must
 *   still move like the farthest object in the sky.
 * - `car` sits BETWEEN the two palm layers: the giant foreground palms crop
 *   the frame edges in front of everything, while the mid-depth palms stand on
 *   the floor behind the car.
 *
 * The ids here MUST each have an entry in `layerComponents` inside
 * `SynthwaveScene.svelte`. This redesign reuses the exact same ten ids (both
 * palm slots per side live inside the existing two palm components), so that
 * map needs no change — only this ordering moved.
 */
export const SCENE_LAYERS: readonly SceneLayer[] = [
	{ id: "sky", depth: 0 },
	{ id: "stars", depth: 0.04 },
	{ id: "mountains-far", depth: 0.18, parallaxY: HORIZON_PARALLAX_Y },
	{ id: "sun", depth: 0.18, parallax: 0.08, parallaxY: HORIZON_PARALLAX_Y },
	{ id: "skyline", depth: 0.28, parallaxY: HORIZON_PARALLAX_Y },
	{ id: "grid", depth: 0.55, parallaxY: HORIZON_PARALLAX_Y },
	{ id: "palm-back", depth: 0.7, parallaxY: HORIZON_PARALLAX_Y },
	{ id: "car", depth: 0.85, parallaxY: HORIZON_PARALLAX_Y },
	{ id: "palm-front", depth: 0.95, parallaxY: HORIZON_PARALLAX_Y },
	{ id: "atmosphere", depth: 1, parallax: 0.1 },
];

/** Horizontal parallax amplitude a layer actually uses. */
export function layerParallaxX(layer: SceneLayer): number {
	return layer.parallax ?? layer.depth;
}

/** Vertical parallax amplitude a layer actually uses. */
export function layerParallaxY(layer: SceneLayer): number {
	return layer.parallaxY ?? layer.parallax ?? layer.depth;
}

/**
 * Pointer parallax travel in px, at amplitude 1, from centre to edge.
 *
 * The horizontal fan is what the eye reads as depth, so it gets the room; the
 * vertical axis buys almost no depth and is the one that tears contact lines
 * apart, so it stays small (and is flattened further by `HORIZON_PARALLAX_Y`).
 */
export const PARALLAX_MAX_X = 34;
export const PARALLAX_MAX_Y = 10;

/**
 * Overscan a full-bleed layer element needs so parallax never drags its edge
 * inside the frame. `SynthwaveScene` publishes these as the CSS custom
 * properties `--parallax-bleed-x` / `--parallax-bleed-y` on the scene root; any
 * layer element with a hard edge at `inset: 0` must spread into them:
 *
 * ```css
 * left: calc(-1 * var(--parallax-bleed-x));
 * right: calc(-1 * var(--parallax-bleed-x));
 * ```
 *
 * They are the maximum travel (amplitude 1), so one value covers every layer,
 * and the scene root's `overflow-hidden` clips whatever spills out.
 */
export const PARALLAX_BLEED_X = PARALLAX_MAX_X;
export const PARALLAX_BLEED_Y = PARALLAX_MAX_Y;

/** How the layers chase the pointer — and ease back when it leaves. */
export const PARALLAX_DURATION = 0.6;
export const PARALLAX_EASE = "power2.out";

/* ------------------------------------------------------------------------- *
 * Assets
 * ------------------------------------------------------------------------- */

/** Root of the generated raster assets (served from `static/`). */
export const ASSET_BASE = "/synthwave";

/**
 * Rendered widths per asset. Mirrors the asset generation script, which skips
 * any width that would upscale past a source's native size — so not every
 * asset has every tier (the palms' source is 1024px wide, so they only ever
 * get the 768 rendition).
 */
export const ASSET_WIDTHS: Record<string, number[]> = {
	sun: [1280, 768],
	"mountains-far": [1280, 768],
	skyline: [1280, 768],
	"palm-back": [768],
	"palm-front": [768],
	car: [1280, 768],
	"mountains-sharp": [768],
	city: [768],
	"sky-clouds": [1280, 768],
};

/** Fallback widths for a name with no `ASSET_WIDTHS` entry. */
const DEFAULT_ASSET_WIDTHS = [768];

/** Most efficient format first — the browser picks the first one it supports. */
export const ASSET_FORMATS = [
	{ ext: "avif", type: "image/avif" },
	{ ext: "webp", type: "image/webp" },
] as const;

/** Every layer is full-bleed, so the slot is always the viewport width. */
export const ASSET_SIZES = "100vw";

/** One `<source>` element's worth of data. */
export interface AssetSource {
	type: string;
	srcset: string;
}

/**
 * `<picture>` source descriptors for a scene asset, following the
 * `<name>-<width>.<ext>` convention:
 *
 * ```svelte
 * <picture>
 *   {#each assetSources("palm-front") as source (source.type)}
 *     <source type={source.type} srcset={source.srcset} sizes={ASSET_SIZES} />
 *   {/each}
 *   <img src={assetFallback("palm-front")} alt="" />
 * </picture>
 * ```
 */
export function assetSources(
	name: string,
	widths: number[] = ASSET_WIDTHS[name] ?? DEFAULT_ASSET_WIDTHS
): AssetSource[] {
	const ordered = [...widths].sort((a, b) => b - a);
	return ASSET_FORMATS.map(({ ext, type }) => ({
		type,
		srcset: ordered.map((width) => `${ASSET_BASE}/${name}-${width}.${ext} ${width}w`).join(", "),
	}));
}

/** `<img src>` fallback: the smallest width, in the most widely supported format. */
export function assetFallback(
	name: string,
	width: number = Math.min(...(ASSET_WIDTHS[name] ?? DEFAULT_ASSET_WIDTHS))
): string {
	return `${ASSET_BASE}/${name}-${width}.webp`;
}

/* ------------------------------------------------------------------------- *
 * Color tokens
 * ------------------------------------------------------------------------- */

/**
 * The scene's palette, magenta-dominant to match the mock (the old scene
 * skewed violet and read washed-out). Hex tokens are for flat gradient stops;
 * `*_RGB` tokens are bare `r, g, b` triplets for composing `rgba(...)` with a
 * per-use alpha.
 */
export const SCENE_COLORS = {
	/** Top of the sky: near-black indigo. */
	skyTop: "#06001a",
	/** Upper sky: deep violet. */
	skyUpper: "#1c0640",
	/** Mid sky, where the sunset haze starts. */
	skyMid: "#4a1150",
	/** Low sky, just above the horizon. */
	skyLow: "#8c2458",
	/** The brightest sky stop, exactly at the horizon line. */
	skyHorizon: "#b23366",
	/** Just below the horizon — the dusk band the floor gradient fades over. */
	duskBelowHorizon: "#2a0930",
	/** Deep floor / bottom-of-frame darkness. */
	nightFloor: "#0a0114",
	/** Dominant scene magenta (#c03268). Grid columns, tint wash, haze. */
	magentaRGB: "192, 50, 104",
	/** Brighter magenta-pink for grid rows, horizon bloom, and fog. */
	magentaBrightRGB: "224, 64, 132",
	/** Warm sunset orange for the sun bloom and tail-light glow. */
	sunsetOrangeRGB: "255, 150, 60",
	/** Violet accent (fog right blob, sparse highlights) — accent only, never dominant. */
	violetRGB: "150, 60, 200",
	/** Near-white pink for the hottest point of the horizon line. */
	horizonHotRGB: "255, 214, 236",
} as const;

/* ------------------------------------------------------------------------- *
 * Sky (id: "sky")
 * ------------------------------------------------------------------------- */

/**
 * Gradient backdrop + the opaque `sky-clouds` raster plate (streaky sunset
 * haze) + a broad warm bloom centred where the sun will sit. The plate is
 * bottom-anchored to the horizon and top-fades into the CSS gradient.
 */
export const SKY = {
	/** Gradient stops, top to bottom, as [color, pct-of-frame-height] pairs. */
	gradientStops: [
		[SCENE_COLORS.skyTop, 0],
		[SCENE_COLORS.skyUpper, 30],
		[SCENE_COLORS.skyMid, 47],
		[SCENE_COLORS.skyLow, 55],
		[SCENE_COLORS.skyHorizon, SCENE_HORIZON_PCT],
		// Below the horizon the sky must go DARK fast: the old flat magenta band
		// here is exactly the "opaque pink bar" the redesign kills.
		[SCENE_COLORS.duskBelowHorizon, 62],
		[SCENE_COLORS.nightFloor, 72],
		[SCENE_COLORS.nightFloor, 100],
	] as const,
	/**
	 * The cloud plate: `width: max(100% + 2 * bleed, 1000px)` centred, bottom
	 * edge on the horizon, excess height cropping out of the frame top. The
	 * 1000px floor keeps narrow/tall viewports covered. Mask its top 18% to
	 * transparent so it dissolves into the gradient instead of seaming.
	 */
	cloudPlateMinWidthPx: 1000,
	cloudPlateTopFadePct: 18,
	cloudPlateOpacity: 0.9,
} as const;

/* ------------------------------------------------------------------------- *
 * Stars (id: "stars")
 * ------------------------------------------------------------------------- */

/**
 * Sparse, dim starfield. The mock's stars are barely-there pinpricks — the old
 * 90-star field at full white read as noise over the sunset.
 */
export const STARFIELD = {
	count: 42,
	/** Never change the seed: it is the "same sky on every render" guarantee. */
	seed: 0x51a2_7547,
	/** Stars only live above the sunset haze. % of frame height. */
	maxHeightPct: 34,
	/** Radius range in px. */
	radiusMinPx: 0.5,
	radiusMaxPx: 1.3,
	/** Twinkle opacity range (CSS keyframes), and the static reduced-motion pose. */
	twinkleMinOpacity: 0.25,
	twinkleMaxOpacity: 0.8,
	staticOpacity: 0.5,
	/** Two desynced twinkle groups, periods sharing no small factor. */
	twinkleASeconds: 3.8,
	twinkleBSeconds: 5.7,
} as const;

/* ------------------------------------------------------------------------- *
 * Mountains (id: "mountains-far")
 * ------------------------------------------------------------------------- */

/**
 * Crisp magenta ridge, built from TWO copies of the `mountains-sharp` strip
 * (1024x169 source, ~6.06:1): a large range anchored to the left edge and a
 * smaller, slightly dimmed one anchored to the right, overlapping mid-frame so
 * the composite reads as a layered range like the mock — the strip at natural
 * scale cannot span the frame without towering over it. The layer id stays
 * `mountains-far` (the component-map key); only the asset it draws changed.
 */
export const MOUNTAINS = {
	asset: "mountains-sharp",
	/** Native aspect of the strip (1024 / 169) — set it as the img aspect-ratio. */
	aspect: 1024 / 169,
	/** Large left range: width in vw, ridge base sits this far below the top of frame. */
	leftWidthVw: 72,
	/** Smaller right range, dimmed so it reads farther. */
	rightWidthVw: 55,
	rightOpacity: 0.85,
	/**
	 * Ridge bases sit slightly BELOW the horizon line so the grid's horizon
	 * bloom overlaps their feet — mountains rising out of haze, not stickers on
	 * a line. % of frame height; anchor with `top: basePct%` +
	 * `translateY(-100%)`.
	 */
	basePct: SCENE_HORIZON_PCT + 1.6,
} as const;

/* ------------------------------------------------------------------------- *
 * Sun (id: "sun")
 * ------------------------------------------------------------------------- */

/**
 * The striped disc — the scene's focal point. The raster plate has generous
 * transparent margin around the disc, so all sizing is derived from the
 * measured disc bounding box inside the plate, and the DISC (not the plate) is
 * what the art direction pins: ~15% of frame width, bottom edge sunk 10.6% of
 * frame height below the horizon.
 */
export const SUN = {
	asset: "sun",
	/** Native plate aspect (1280x853). */
	plateAspect: 1280 / 853,
	/** Measured disc bbox inside the plate (fractions of plate width/height). */
	discWidthFrac: 0.336,
	discBottomFrac: 0.707,
	discCenterXFrac: 0.493,
	/** Disc target: ~15% of frame width. Plate width = 15 / 0.336 ≈ 45vw. */
	plateWidthCss: "clamp(720px, 45vw, 980px)",
	/** The resulting disc, for anything that sizes against it (halo centring). */
	discWidthCss: "clamp(242px, 15.1vw, 329px)",
	/**
	 * The disc's bottom edge, % of frame height — BELOW the horizon (57.4%), so
	 * the disc visibly crosses it. Anchor the plate with `top: 68%` +
	 * `translate(-49.3%, -70.7%)`: translate percentages are of the element's
	 * own box, so -70.7% puts the measured disc bottom exactly on the 68% line
	 * and -49.3% centres the measured disc (not the plate) on mid-frame.
	 */
	discBottomPct: 68,
	/** Halo diameter ≈ 2.4x the disc. */
	haloWidthCss: "clamp(580px, 36vw, 790px)",
	/** Halo pulse peak scale (GSAP, yoyo). */
	haloPulseScale: 1.05,
} as const;

/** Seconds for one full sun-halo breath (out and back). */
export const SUN_HALO_PULSE_SECONDS = 7;

/* ------------------------------------------------------------------------- *
 * City skyline (id: "skyline")
 * ------------------------------------------------------------------------- */

/**
 * Distant neon city on the horizon's right, drawn from the `city` plate
 * (1073x541 source, base flush with the image's bottom edge). Small on
 * purpose: it reads as kilometres away. A mirrored, faded copy below the
 * horizon is its reflection — cheap (same texture, one extra img) and sells
 * the "wet floor" of the mock.
 */
export const CITY = {
	asset: "city",
	/** Native aspect of the cropped plate. */
	aspect: 1073 / 541,
	widthCss: "clamp(180px, 12vw, 260px)",
	/** Horizontal centre of the city cluster, % of frame width. */
	centerXPct: 76,
	/** Base sits exactly on the horizon: `top: SCENE_HORIZON_PCT%` + `translate(-50%, -100%)`. */
	reflection: {
		/** Mirror with `scaleY(-0.55)` (squashed), then fade and blur. */
		scaleY: -0.55,
		opacity: 0.22,
		blurPx: 1.5,
		/** Mask the reflection to transparent by this % of its own height. */
		fadeOutPct: 85,
	},
} as const;

/* ------------------------------------------------------------------------- *
 * Grid floor (id: "grid")
 * ------------------------------------------------------------------------- */

/**
 * The neon floor. Coarser, more magenta, and softer at the horizon than the
 * old scene: cells are ~4.3x larger, the violet column tint is gone, and the
 * old opaque floor base now fades in from transparent at the horizon so the
 * sun's sunken disc slice glows through it (the layer order relies on this).
 *
 * Projection geometry (plane-local px, from the rotation axis, positive =
 * toward the viewer): perspective 640px with the eye on the horizon line,
 * plane tilted 82° about an axis 160px below the horizon. `far`/`near` are the
 * plane's extents past the axis. The eye plane sits at 640 / sin(82°) ≈ 646
 * plane-px; the scroll wrapper's deepest painted point is `near` + one cell of
 * tween travel = 340 + 260 = 600 < 646, so it can never cross it.
 */
export const GRID = {
	/**
	 * Grid cell in plane-local px. The scroll tween travels exactly one cell
	 * per loop — that equality is what makes the loop seamless.
	 */
	cellPx: 260,
	perspectivePx: 640,
	tiltDeg: 82,
	axisBelowHorizonPx: 160,
	farPx: 1560,
	nearPx: 340,
	/** Plane width, % of the frame — covers the horizon at far-edge compression. */
	planeWidthPct: 300,
	/** Rows (horizontal lines): bright magenta-pink. */
	lineRGB: SCENE_COLORS.magentaBrightRGB,
	lineAlpha: 0.9,
	/** Columns: the dominant magenta, slightly dimmer than rows. */
	columnRGB: SCENE_COLORS.magentaRGB,
	columnAlpha: 0.75,
	/**
	 * Floor base gradient: transparent AT the horizon (the sun shows through),
	 * opaque `nightFloor` by this many px below it. This replaces the old
	 * opaque box — the "pink bar" fix and the sun-melt effect in one gradient.
	 */
	baseFadeInPx: 150,
	/**
	 * Horizon bloom: one wide, soft magenta ellipse straddling the horizon
	 * (width %, height px, blur px) — NOT a hard bar. The thin hot line on top
	 * of it stays subtle and fades out well before the frame edges.
	 */
	bloomWidthPct: 92,
	bloomHeightPx: 110,
	bloomBlurPx: 26,
	bloomAlpha: 0.5,
} as const;

/** Seconds for the grid to travel exactly one cell — the loop must be seamless. */
export const GRID_SCROLL_SECONDS = 5.2;

/* ------------------------------------------------------------------------- *
 * Palms (ids: "palm-back", "palm-front")
 * ------------------------------------------------------------------------- */

/**
 * Base sway amplitude in degrees (±, symmetric about the source render's own
 * lean). Slots override it — the giant foreground palms move less than the
 * small mid-depth ones, because a big thing swinging fast reads as wind storm.
 */
export const PALM_SWAY_DEGREES = 0.8;
/** Legacy left-slot periods; the right slots get their own inside PALM_SLOTS. */
export const PALM_BACK_SWAY_SECONDS = 7;
export const PALM_FRONT_SWAY_SECONDS = 9;

export interface PalmSlot {
	/** Stable per-slot name (also handy as a CSS class). */
	slot: "back-left" | "back-right" | "front-left" | "front-right";
	/** Which raster asset the slot draws. */
	asset: "palm-back" | "palm-front";
	/**
	 * Both palm sources lean right (base bottom-left, crown top-right).
	 * Right-edge slots mirror so every palm leans INTO the frame. Apply
	 * `scaleX(-1)` on the `<img>`, never on the sway wrapper — GSAP owns the
	 * wrapper's transform and would clobber the mirror.
	 */
	mirrored: boolean;
	/** Element height, % of frame height. */
	heightPct: number;
	/** Bottom anchor, % of frame height from the bottom (negative = cropped below). */
	bottomPct: number;
	/** Exactly one horizontal anchor, % of frame width (negative = cropped outside). */
	leftPct?: number;
	rightPct?: number;
	/** Sway period; the four periods share no factor, so they never sync up. */
	swaySeconds: number;
	/** Sway amplitude override, ± degrees. */
	swayDegrees: number;
}

/**
 * Four palms, two per component: `PalmBackLayer` renders the `back-*` slots
 * (small, mid-depth, standing on the floor just below the horizon, behind the
 * car), `PalmFrontLayer` the `front-*` slots (giant, edge-cropped foreground
 * framing, in front of the car). Each slot gets its own sway tween on the
 * scene timeline.
 */
export const PALM_SLOTS: readonly PalmSlot[] = [
	{
		slot: "back-left",
		asset: "palm-back",
		mirrored: false,
		heightPct: 30,
		bottomPct: 34,
		leftPct: 16,
		swaySeconds: PALM_BACK_SWAY_SECONDS,
		swayDegrees: 1.1,
	},
	{
		slot: "back-right",
		asset: "palm-back",
		mirrored: true,
		heightPct: 26,
		bottomPct: 36,
		leftPct: 71,
		swaySeconds: 9.5,
		swayDegrees: 1.1,
	},
	{
		slot: "front-left",
		asset: "palm-front",
		mirrored: false,
		heightPct: 125,
		bottomPct: -30,
		leftPct: -7,
		swaySeconds: PALM_FRONT_SWAY_SECONDS,
		swayDegrees: 0.6,
	},
	{
		slot: "front-right",
		asset: "palm-front",
		mirrored: true,
		heightPct: 135,
		bottomPct: -25,
		rightPct: -9,
		swaySeconds: 11,
		swayDegrees: 0.6,
	},
];

/* ------------------------------------------------------------------------- *
 * Car (id: "car")
 * ------------------------------------------------------------------------- */

/**
 * The hero car, parked low on the grid right-of-centre — large and close, per
 * the mock (the old 15%-wide car floating near the horizon read as a toy).
 */
export const CAR = {
	asset: "car",
	/** Native plate aspect (1280x853). */
	aspect: 1280 / 853,
	/** ~22% of frame width. */
	widthCss: "clamp(300px, 22vw, 440px)",
	/** Left edge % of frame width — puts the car's centre near 66%. */
	leftPct: 55,
	/** Wheels sit 15% of frame height above the bottom edge, deep in the grid band. */
	bottomPct: 15,
} as const;

/** Seconds for one tail-light glow breath. */
export const CAR_GLOW_PULSE_SECONDS = 2.4;
/**
 * Dimmest point of that breath. The glow's CSS rest state is fully lit, so the
 * no-JS and reduced-motion poses show the tail lights on, and only the tween
 * ever dips them.
 */
export const CAR_GLOW_MIN_OPACITY = 0.75;

/* ------------------------------------------------------------------------- *
 * Atmosphere (id: "atmosphere")
 * ------------------------------------------------------------------------- */

/**
 * Frontmost framing: fog blobs, rising particles, scanlines, a magenta grade
 * wash, and the corner vignette that gives the mock its pooled-darkness edges.
 */
export const ATMOSPHERE = {
	/** Rising ember/dust dots. Fewer than before — garnish, not weather. */
	particleCount: 10,
	/** Scanline stripe alpha (white). Barely-there CRT texture. */
	scanlineAlpha: 0.03,
	/**
	 * Flat magenta wash over the whole frame — the "saturation up" grade.
	 * Composites with normal blending; keep it subtle or it fogs the blacks.
	 */
	gradeRGB: SCENE_COLORS.magentaRGB,
	gradeAlpha: 0.06,
	/**
	 * Vignette: transparent centre, heavy corners. Ellipse centred slightly
	 * above mid-frame so the bottom edge darkens fastest (where the footer
	 * links sit).
	 */
	vignette: {
		innerStopPct: 36,
		midAlpha: 0.5,
		midStopPct: 78,
		edgeAlpha: 0.78,
	},
} as const;

/** Seconds for one atmosphere/fog drift cycle. */
export const FOG_DRIFT_SECONDS = 24;

/* ------------------------------------------------------------------------- *
 * Scene context
 * ------------------------------------------------------------------------- */

export interface SynthwaveSceneContext {
	/**
	 * The scene's master timeline, or `null` whenever motion is suppressed
	 * (reduced motion, before mount). Read it inside an `$effect` so a layer
	 * attaches and detaches as the preference flips.
	 */
	timeline: () => gsap.core.Timeline | null;
	/** Live reduced-motion preference, for layers that gate more than tweens. */
	reducedMotion: () => boolean;
}

const SCENE_CONTEXT_KEY = Symbol("fancy-ui:synthwave-scene");

/** What a layer sees when it is rendered outside a scene: no motion at all. */
const INERT_CONTEXT: SynthwaveSceneContext = {
	timeline: () => null,
	reducedMotion: () => true,
};

/** Called by `SynthwaveScene` during init. */
export function setSceneContext(context: SynthwaveSceneContext): SynthwaveSceneContext {
	return setContext(SCENE_CONTEXT_KEY, context);
}

/**
 * Called by layer components during init. Never throws: a layer mounted on its
 * own (isolated harness, unit test) simply renders its static pose.
 */
export function getSceneContext(): SynthwaveSceneContext {
	return getContext<SynthwaveSceneContext | undefined>(SCENE_CONTEXT_KEY) ?? INERT_CONTEXT;
}
