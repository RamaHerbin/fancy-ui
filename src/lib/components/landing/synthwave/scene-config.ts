/**
 * Single source of truth for the synthwave landing scene: layer order, geometry
 * anchors, color tokens, parallax amplitudes, asset naming, animation timings,
 * and the Svelte context the scene root shares with its layer components.
 *
 * Nothing here touches the DOM, so layers and tests can import it freely.
 * Layers import ONLY this module — never each other.
 *
 * v2 calibration: the scene is re-graded against the v2 reference. The verdict
 * on v1 was "bright pink haze everywhere"; v2 is DEEP BLACK with light
 * concentrated around the sun and the neon lines. Every geometry/color number
 * below is measured from the v2 reference. Percentages are of the scene frame
 * (the host section's box) unless a comment says otherwise.
 */
import { getContext, setContext } from "svelte";
import type { gsap } from "gsap";

/* ------------------------------------------------------------------------- *
 * Horizon
 * ------------------------------------------------------------------------- */

/**
 * The horizon line — now the WATERLINE — in % of frame height from the top.
 * One number shared by every layer that meets it: the sky gradient's brightest
 * stop, the mountain ridge bases, the city base, the sun disc's resting edge,
 * and the water band's top edge all sit exactly here. Layers inject it via an
 * inline style (`style={`--horizon: ${SCENE_HORIZON_PCT}%`}`) so no layer
 * hardcodes its own copy.
 *
 * v2: the grid floor no longer starts here — a reflective water band occupies
 * `SCENE_HORIZON_PCT .. WATER.bottomPct`, and the grid begins at `GRID.topPct`.
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
 * off the waterline, or the car floating above the grid cell it is parked on,
 * reads as broken, where the exact same slide sideways reads as depth. So the
 * whole horizon-and-floor group travels as one vertically and fans out only
 * horizontally.
 */
const HORIZON_PARALLAX_Y = 0.3;

/**
 * Back-to-front. `SynthwaveScene` renders wrappers in exactly this order, so
 * DOM order is the z-order and no layer ever carries a z-index.
 *
 * Deliberate order decisions (this array is the one stacking authority):
 *
 * - `sun` draws IN FRONT of `mountains-far`. Physically wrong, visually right:
 *   the full striped disc must read; with the ridge in front it lost its
 *   bottom and read as a dome. v2: the disc SITS ON the waterline (it no
 *   longer sinks 10% into the floor), and the `water` band stacked after it
 *   clips only its bottom sliver — the melt is now a reflection, not a burial.
 * - `sun.parallax` is overridden low: it stacks in front of the ridge but must
 *   still move like the farthest object in the sky.
 * - `water` sits AFTER `skyline` and BEFORE `grid`: the band's dark surface
 *   must cover the mountain feet and the city base (their reflections are
 *   drawn INSIDE the water layer), while the grid's shore edge overlaps the
 *   water's near edge so the floor reads as land in front of the water.
 * - `car` sits BETWEEN the two palm layers: the giant foreground palms crop
 *   the frame edges in front of everything, while the mid-depth palms stand on
 *   the floor behind the car.
 *
 * The ids here MUST each have an entry in `layerComponents` inside
 * `SynthwaveScene.svelte` — EXCEPT during the v2 wave: `water` is new and its
 * component + map entry land with the water agent (an id without an entry
 * renders as an empty wrapper, which the test suite explicitly allows).
 */
export const SCENE_LAYERS: readonly SceneLayer[] = [
	{ id: "sky", depth: 0 },
	{ id: "stars", depth: 0.04 },
	{ id: "mountains-far", depth: 0.18, parallaxY: HORIZON_PARALLAX_Y },
	{ id: "sun", depth: 0.18, parallax: 0.08, parallaxY: HORIZON_PARALLAX_Y },
	{ id: "skyline", depth: 0.28, parallaxY: HORIZON_PARALLAX_Y },
	{ id: "water", depth: 0.38, parallaxY: HORIZON_PARALLAX_Y },
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
 *
 * INVARIANT (test-enforced): every name/width pair listed here must have its
 * `.avif` AND `.webp` on disk under `static/synthwave/`. The v2 `water` layer
 * deliberately has NO entry — it is CSS-only plus a reuse of the `city` plate,
 * so no new raster is required. Do not add an entry before its files exist.
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
 * The scene's palette. v2 grade: NEAR-BLACK base + concentrated accents. The
 * v1 palette bathed the frame in magenta ("wall-to-wall pink"); v2 pulls every
 * field color down toward black and keeps saturation for the lines, the sun,
 * and the neon city only. Hex tokens are for flat gradient stops; `*_RGB`
 * tokens are bare `r, g, b` triplets for composing `rgba(...)` with a per-use
 * alpha.
 */
export const SCENE_COLORS = {
	/** Top of the sky: near-black. */
	skyTop: "#030010",
	/** Upper sky: very deep indigo. */
	skyUpper: "#10032a",
	/** Mid sky, where the sunset haze starts — dark violet, no longer bright. */
	skyMid: "#2a0a3c",
	/** Low sky, just above the horizon — restrained plum. */
	skyLow: "#55163f",
	/** The brightest sky stop, exactly at the waterline. Dimmer than v1. */
	skyHorizon: "#7c2148",
	/** Just below the horizon — covered by the water band, kept dark. */
	duskBelowHorizon: "#14041f",
	/** Deep floor / bottom-of-frame darkness. Near-black. */
	nightFloor: "#060010",
	/** Water band surface, top (catches horizon light) and bottom (near-black). */
	waterTop: "#1c0733",
	waterBottom: "#07000f",
	/** Dominant scene magenta (#c03268). Grid columns, haze accents. */
	magentaRGB: "192, 50, 104",
	/** Brighter magenta-pink for grid rows, shoreline bloom, and fog. */
	magentaBrightRGB: "224, 64, 132",
	/** Warm sunset orange for the sun bloom and its water reflection. */
	sunsetOrangeRGB: "255, 150, 60",
	/** Crimson for the sun's lower disc and the reflection column's mid stop. */
	crimsonRGB: "255, 70, 90",
	/** Tail-light red — the car's glow is red in v2, not orange. */
	tailLightRGB: "255, 56, 40",
	/** Violet accent (fog right blob, sparse highlights) — accent only, never dominant. */
	violetRGB: "150, 60, 200",
	/** Near-white pink for the hottest point of the shoreline. */
	horizonHotRGB: "255, 214, 236",
} as const;

/* ------------------------------------------------------------------------- *
 * Global color grade (applied by the atmosphere layer)
 * ------------------------------------------------------------------------- */

/**
 * The v2 grade in three strokes, all painted by `AtmosphereLayer` as static
 * full-bleed overlays (normal blending — no backdrop-filter, it is too
 * expensive at this size):
 *
 * - `exposure`: a uniform dark wash that pulls the whole frame down. This is
 *   the "everything darker" pass — the lines and the sun stay readable because
 *   they start bright, while the v1 haze fields sink into black.
 * - `saturation`: the residual magenta tint wash. v1 ran it at 0.06 and it
 *   fogged the blacks; v2 keeps a trace (0.02) so the grade still leans warm.
 * - `vignette`: the strongest tool in the v2 kit. Centred on the sun
 *   (50%, 42%) so light stays pooled around the disc and the corners crush to
 *   black, exactly like the reference's dark framing.
 */
export const SCENE_GRADE = {
	/** Uniform exposure pull-down: `rgba(exposureRGB, exposureAlpha)` full-bleed. */
	exposureRGB: "4, 0, 12",
	exposureAlpha: 0.12,
	/** Residual magenta tint wash (the old "grade wash", heavily reduced). */
	saturationRGB: SCENE_COLORS.magentaRGB,
	saturationAlpha: 0.02,
	/**
	 * Vignette: transparent pool around the sun, heavy black corners.
	 * `radial-gradient(ellipse 120% 100% at centerX% centerY%, transparent
	 * innerStopPct%, rgba(0,0,0,midAlpha) midStopPct%, rgba(0,0,0,edgeAlpha)
	 * 100%)`. Spreads into the parallax bleed.
	 */
	vignette: {
		centerXPct: 50,
		centerYPct: 42,
		innerStopPct: 30,
		midAlpha: 0.55,
		midStopPct: 68,
		edgeAlpha: 0.9,
	},
} as const;

/* ------------------------------------------------------------------------- *
 * Sky (id: "sky")
 * ------------------------------------------------------------------------- */

/**
 * Gradient backdrop + the `sky-clouds` raster plate (horizontal striated
 * sunset clouds) + a warm bloom centred where the sun sits. The plate is
 * bottom-anchored to the horizon and top-fades into the CSS gradient.
 *
 * v2: the gradient stops are all pulled down toward black (the sky must read
 * near-black away from the sun), and the cloud plate is RE-CROPPED — the v1
 * crop kept the top of the source plate and threw away the bright striated
 * band that is the whole point of the reference sky. See DESIGN-SPEC-V2.md,
 * sky section, for the re-crop window.
 */
export const SKY = {
	/** Gradient stops, top to bottom, as [color, pct-of-frame-height] pairs. */
	gradientStops: [
		[SCENE_COLORS.skyTop, 0],
		[SCENE_COLORS.skyUpper, 30],
		[SCENE_COLORS.skyMid, 46],
		[SCENE_COLORS.skyLow, 53],
		[SCENE_COLORS.skyHorizon, SCENE_HORIZON_PCT],
		// Below the horizon the water band and grid cover everything — go dark
		// immediately so nothing pink can bleed through their soft edges.
		[SCENE_COLORS.duskBelowHorizon, 62],
		[SCENE_COLORS.nightFloor, 70],
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
	cloudPlateOpacity: 0.85,
	/**
	 * Warm bloom around the sun's spot — v2: tighter and dimmer than v1, so the
	 * light CONCENTRATES around the disc instead of washing the whole sky.
	 * Ellipse centred on (50%, horizon), `translate(-50%, offsetYPct%)`.
	 * Gradient: `rgba(sunsetOrangeRGB, orangeAlpha) → rgba(magentaBrightRGB,
	 * magentaAlpha) 45% → transparent 72%`, static blur.
	 */
	sunBloom: {
		widthVw: 52,
		aspect: "7 / 3",
		offsetYPct: -55,
		orangeAlpha: 0.26,
		magentaAlpha: 0.15,
		blurPx: 36,
	},
} as const;

/* ------------------------------------------------------------------------- *
 * Stars (id: "stars")
 * ------------------------------------------------------------------------- */

/**
 * Sparse, dim starfield. Owner verdict on v1: fine as-is — every value below
 * is unchanged. Do not touch this layer in the v2 wave.
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
 * Ridge behind the sun, built from TWO copies of the `mountains-sharp` strip
 * (1024x169 source, ~6.06:1): a large range anchored to the left edge and a
 * smaller one anchored to the right, overlapping mid-frame. The layer id stays
 * `mountains-far` (the component-map key).
 *
 * v2: the ranges become NEAR-BLACK SILHOUETTES with a subtle rim — the v1
 * pink-lit ridge fought the sun for attention. The darkening is a static CSS
 * filter on the `<img>`s (static filters are allowed; only animating one is
 * not).
 */
export const MOUNTAINS = {
	asset: "mountains-sharp",
	/** Native aspect of the strip (1024 / 169) — set it as the img aspect-ratio. */
	aspect: 1024 / 169,
	/** Large left range: width in vw. */
	leftWidthVw: 72,
	/** Smaller right range, dimmed so it reads farther. */
	rightWidthVw: 55,
	rightOpacity: 0.9,
	/**
	 * Silhouette grade, applied as
	 * `filter: brightness(brightness) saturate(saturate)` on both imgs.
	 * Keeps a faint magenta rim from the source art while crushing the faces
	 * to near-black.
	 */
	silhouette: {
		brightness: 0.35,
		saturate: 0.75,
	},
	/**
	 * Ridge bases sit slightly BELOW the horizon line so the WATER BAND (which
	 * stacks in front) covers their feet — mountains standing at the far shore,
	 * not stickers on a line. % of frame height; anchor with `top: basePct%` +
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
 * what the art direction pins.
 *
 * v2 headline change: the disc SITS ON the waterline instead of sinking 10.6%
 * into the floor. Its bottom edge rests a hair (0.4%) below the horizon so it
 * visually kisses the water; the water band stacked in front clips that sliver
 * and draws the reflection column below — sun-on-water, per the reference.
 * Slightly smaller than v1 (disc ≈ 13.4% of frame width, was 15.1%).
 */
export const SUN = {
	asset: "sun",
	/** Native plate aspect (1280x853). */
	plateAspect: 1280 / 853,
	/** Measured disc bbox inside the plate (fractions of plate width/height). */
	discWidthFrac: 0.336,
	discBottomFrac: 0.707,
	discCenterXFrac: 0.493,
	/** Disc target: ~13.4% of frame width. Plate width = 13.4 / 0.336 ≈ 40vw. */
	plateWidthCss: "clamp(640px, 40vw, 880px)",
	/** The resulting disc, for anything that sizes against it (halo centring). */
	discWidthCss: "clamp(215px, 13.4vw, 296px)",
	/**
	 * The disc's bottom edge, % of frame height — ON the waterline (0.4% below
	 * the 57.4% horizon, so the contact reads as touching, not floating).
	 * Anchor the plate with `top: 57.8%` + `translate(-49.3%, -70.7%)`:
	 * translate percentages are of the element's own box, so -70.7% puts the
	 * measured disc bottom exactly on the 57.8% line and -49.3% centres the
	 * measured disc (not the plate) on mid-frame.
	 */
	discBottomPct: SCENE_HORIZON_PCT + 0.4,
	/** Halo diameter ≈ 1.9x the disc — tighter than v1's 2.4x. */
	haloWidthCss: "clamp(415px, 26vw, 575px)",
	/**
	 * Halo gradient: `rgba(sunsetOrangeRGB, orangeAlpha) →
	 * rgba(magentaBrightRGB, magentaAlpha) 45% → transparent 70%`, static blur.
	 * v2: dimmer than v1 (0.5/0.32) — glow, not floodlight.
	 */
	halo: {
		orangeAlpha: 0.38,
		magentaAlpha: 0.2,
		blurPx: 40,
	},
	/** Halo pulse peak scale (GSAP, yoyo). */
	haloPulseScale: 1.04,
} as const;

/** Seconds for one full sun-halo breath (out and back). */
export const SUN_HALO_PULSE_SECONDS = 7;

/* ------------------------------------------------------------------------- *
 * City skyline (id: "skyline")
 * ------------------------------------------------------------------------- */

/**
 * Neon city on the horizon's right, drawn from the `city` plate (1073x541
 * source, base flush with the image's bottom edge — zero bottom padding).
 *
 * v2: PROMOTED. The v1 city was a faint pale silhouette; the reference shows
 * a clearly visible blue-cyan neon cluster with lit windows standing at the
 * water's edge. Bigger, brighter, and tinted toward cyan with a static CSS
 * filter (the plate's source art is magenta/violet).
 *
 * The reflection is NO LONGER drawn by this layer: the water band owns every
 * below-horizon pixel, so `WATER.cityReflection` (=== `CITY.reflection`)
 * renders it inside `WaterLayer`. SkylineLayer draws the city ABOVE the
 * horizon only.
 */
export const CITY = {
	asset: "city",
	/** Native aspect of the cropped plate. */
	aspect: 1073 / 541,
	widthCss: "clamp(230px, 16vw, 350px)",
	/** Horizontal centre of the city cluster, % of frame width. */
	centerXPct: 78,
	/**
	 * Blue-cyan neon tint, applied as `filter: hue-rotate(hueRotateDeg deg)
	 * saturate(saturate) brightness(brightness)` on the city img (and inherited
	 * by the water layer's mirrored copy so both halves match).
	 */
	tint: {
		hueRotateDeg: -70,
		saturate: 1.35,
		brightness: 1.25,
	},
	/** Base sits exactly on the horizon: `top: SCENE_HORIZON_PCT%` + `translate(-50%, -100%)`. */
	reflection: {
		/** Mirror with `scaleY(-0.5)` (squashed), then fade and blur. */
		scaleY: -0.5,
		opacity: 0.26,
		blurPx: 2,
		/** Mask the reflection to transparent by this % of its own height. */
		fadeOutPct: 80,
	},
} as const;

/* ------------------------------------------------------------------------- *
 * Water band (id: "water") — NEW in v2
 * ------------------------------------------------------------------------- */

/**
 * The dark reflective water band between the far shore (mountains + city) and
 * the grid floor — the reference element v1 was missing entirely. CSS-only
 * plus one reuse of the `city` plate; deliberately NO new raster asset (see
 * the ASSET_WIDTHS invariant).
 *
 * Geometry: a thin band from the horizon (57.4%) to `bottomPct`. The grid
 * floor starts at `GRID.topPct` (62%), 0.4% above the water's bottom edge, so
 * the grid's soft fade-in overlaps the water's near edge — a shore, not a
 * seam. Stacking: behind the grid, in front of sun/skyline/mountains, so the
 * band covers their feet and carries their reflections.
 *
 * Contents, back to front inside the layer:
 * 1. Base: vertical gradient `waterTop → waterBottom`, full-bleed sideways.
 * 2. Sheen: 2-3 thin horizontal streaks, `rgba(magentaBrightRGB, sheenAlpha)`.
 * 3. Sun reflection: a blurred warm column under the disc, broken into
 *    horizontal ripples by a repeating-linear-gradient mask.
 * 4. City reflection: the `city` plate mirrored (`CITY.reflection` +
 *    `CITY.tint`), anchored below the horizon at `CITY.centerXPct`.
 * 5. Shoreline: the hot 1px line ON the horizon (this replaces the grid's v1
 *    `.horizon-line` — the waterline is where the hot edge lives now).
 *
 * All static — no tweens, nothing to gate under reduced motion.
 */
export const WATER = {
	/** Band top = the horizon/waterline. */
	topPct: SCENE_HORIZON_PCT,
	/** Band bottom, % of frame height. Band height ≈ 5% of the frame. */
	bottomPct: 62.4,
	/** Base gradient, top to bottom. */
	baseTop: SCENE_COLORS.waterTop,
	baseBottom: SCENE_COLORS.waterBottom,
	/** Thin horizontal sheen streaks on the surface. */
	sheenRGB: SCENE_COLORS.magentaBrightRGB,
	sheenAlpha: 0.08,
	/**
	 * The hot shoreline at the very top of the band: 1px,
	 * `rgba(horizonHotRGB, alpha)` at centre, fully transparent by
	 * `fadeInPct` / `100 - fadeInPct` of the width.
	 */
	shoreline: {
		alpha: 0.55,
		fadeInPct: 20,
	},
	/**
	 * The sun's reflection column, centred under the disc (50%): vertical
	 * gradient `rgba(sunsetOrangeRGB, topAlpha) → rgba(crimsonRGB, midAlpha)
	 * 55% → transparent 95%`, blurred, masked into horizontal ripple bands
	 * (transparent gaps every `rippleGapPx`).
	 */
	sunReflection: {
		centerXPct: 50,
		/** Slightly wider than the disc so the shimmer reads as spread. */
		widthCss: "clamp(240px, 15.5vw, 350px)",
		topAlpha: 0.45,
		midAlpha: 0.22,
		blurPx: 6,
		rippleGapPx: 3,
	},
	/** The city's mirrored reflection — one config, shared with `CITY`. */
	cityReflection: CITY.reflection,
} as const;

/* ------------------------------------------------------------------------- *
 * Grid floor (id: "grid")
 * ------------------------------------------------------------------------- */

/**
 * The neon floor. v2 verdict: "thin pink lines on a NEAR-BLACK floor,
 * moderate glow" — the v1 floor glowed wall-to-wall. Changes: the floor base
 * is opaque near-black almost immediately (the sun no longer melts through
 * it — the water band handles the below-horizon story), line alphas drop, the
 * line falloff halves, and the bloom shrinks.
 *
 * The plane now starts at `topPct` (62%), NOT at the horizon: the water band
 * occupies 57.4%..62.4%, and the grid's top edge tucks 0.4% under the water's
 * bottom edge so its fade-in overlaps the water — a shore contact, no seam.
 * GridLayer anchors `.floor-base` / `.grid-viewport` at
 * `--grid-top: ${GRID.topPct}%` instead of `--horizon`.
 *
 * Projection geometry (plane-local px, from the rotation axis, positive =
 * toward the viewer) is unchanged from v1, now anchored on the grid-top line:
 * perspective 640px with the eye on that line, plane tilted 82° about an axis
 * 160px below it. The eye plane sits at 640 / sin(82°) ≈ 646 plane-px; the
 * scroll wrapper's deepest painted point is `near` + one cell of tween travel
 * = 340 + 260 = 600 < 646, so it can never cross it.
 */
export const GRID = {
	/**
	 * Top edge of the floor, % of frame height — BELOW the water band's top.
	 * 0.4% above WATER.bottomPct (the overlap is the shore).
	 */
	topPct: 62,
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
	/** Rows (horizontal lines): magenta-pink, dimmer than v1 (was 0.9). */
	lineRGB: SCENE_COLORS.magentaBrightRGB,
	lineAlpha: 0.7,
	/** Columns: the dominant magenta, dimmer than rows (was 0.75). */
	columnRGB: SCENE_COLORS.magentaRGB,
	columnAlpha: 0.5,
	/**
	 * Line rendering: 1px core, soft falloff fully transparent by `falloffPx`
	 * either side (v1 ran 10px falloffs — halved so the lines read THIN; the
	 * mid stop at ~falloffPx/2 carries 0.24x the core alpha).
	 */
	falloffPx: 6,
	/**
	 * Floor base: transparent at the grid top, opaque `nightFloor` within this
	 * many px — a fast fade whose only job is softening the shore contact
	 * against the water band (v1's slow 150px sun-melt fade is gone).
	 */
	baseFadeInPx: 40,
	/**
	 * Bloom straddling the GRID TOP edge (not the horizon): narrower, lower,
	 * dimmer than v1 (92% / 110px / 0.5) — "moderate glow".
	 */
	bloomWidthPct: 70,
	bloomHeightPx: 70,
	bloomBlurPx: 22,
	bloomAlpha: 0.3,
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

/**
 * v2 silhouette grade per palm asset, applied as
 * `filter: brightness(brightness) saturate(saturate)` on each slot's `<img>`
 * (static filter — allowed). The v1 palms were lit pink; the reference frames
 * the scene with NEAR-BLACK fronds. The foreground pair goes darkest; the
 * mid-depth pair keeps a trace of rim light so it still separates from the
 * floor.
 */
export const PALM_SILHOUETTES: Record<"palm-back" | "palm-front", { brightness: number; saturate: number }> = {
	"palm-back": { brightness: 0.4, saturate: 0.8 },
	"palm-front": { brightness: 0.22, saturate: 0.7 },
};

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
 * (small, mid-depth, standing on the floor, behind the car), `PalmFrontLayer`
 * the `front-*` slots (giant, edge-cropped foreground framing, in front of
 * the car). Each slot gets its own sway tween on the scene timeline.
 * Geometry unchanged from v1 — only the silhouette grade is new.
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
 * The car, parked on the grid RIGHT of frame. v2 verdict on v1: "huge,
 * centered, strong orange halo" — the reference car is moderate, right-side,
 * with red tail lights and a subtle glow. Smaller (20vw, was 22vw), pushed
 * right (centre ≈ 73%, was ≈ 66%), and lifted so its wheels sit in the upper
 * grid band instead of dominating the foreground.
 */
export const CAR = {
	asset: "car",
	/** Native plate aspect (1280x853). */
	aspect: 1280 / 853,
	/** ~20% of frame width. */
	widthCss: "clamp(260px, 20vw, 390px)",
	/** Left edge % of frame width — puts the car's centre near 73%. */
	leftPct: 63,
	/** Wheels sit 26% of frame height above the bottom edge. */
	bottomPct: 26,
	/**
	 * Tail glow gradient: `rgba(tailLightRGB, coreAlpha) →
	 * rgba(magentaBrightRGB, fringeAlpha) 55% → transparent 75%`, static blur.
	 * v2: RED core (was orange) and roughly half the v1 energy — the glow
	 * should read as tail lights, not an explosion.
	 */
	glow: {
		coreRGB: SCENE_COLORS.tailLightRGB,
		coreAlpha: 0.55,
		fringeRGB: SCENE_COLORS.magentaBrightRGB,
		fringeAlpha: 0.22,
		blurPx: 16,
	},
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
 * Frontmost framing: fog blobs, rising particles, scanlines, and the global
 * grade (exposure + saturation wash + vignette) from `SCENE_GRADE`. The
 * legacy `gradeRGB` / `gradeAlpha` / `vignette` keys alias `SCENE_GRADE` so
 * existing markup keeps compiling; the atmosphere agent should migrate to
 * reading `SCENE_GRADE` directly and add the exposure wash (new in v2).
 */
export const ATMOSPHERE = {
	/** Rising ember/dust dots. Garnish, not weather. */
	particleCount: 8,
	/** Scanline stripe alpha (white). Barely-there CRT texture. */
	scanlineAlpha: 0.03,
	/**
	 * Fog blob alphas — v2: halved from v1 (0.3 / 0.22). The fog was a major
	 * source of the "pink haze everywhere" read. Left blob
	 * `rgba(magentaBrightRGB, fogLeftAlpha)`, right blob
	 * `rgba(violetRGB, fogRightAlpha)`.
	 */
	fogLeftAlpha: 0.14,
	fogRightAlpha: 0.1,
	/** @deprecated alias of SCENE_GRADE.saturationRGB/saturationAlpha. */
	gradeRGB: SCENE_GRADE.saturationRGB,
	gradeAlpha: SCENE_GRADE.saturationAlpha,
	/** @deprecated alias of SCENE_GRADE.vignette. */
	vignette: SCENE_GRADE.vignette,
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
