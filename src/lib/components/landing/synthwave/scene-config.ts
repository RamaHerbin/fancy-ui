/**
 * Single source of truth for the synthwave landing scene: layer order, parallax
 * amplitudes, asset naming, animation timings, and the Svelte context the scene
 * root shares with its layer components.
 *
 * Nothing here touches the DOM, so layers and tests can import it freely.
 */
import { getContext, setContext } from "svelte";
import type { gsap } from "gsap";

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
	 * sits in front of everything yet must barely move.
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
 * off the horizon line, or the car floating above the grid cell it is parked on,
 * reads as broken, where the exact same slide sideways reads as depth. So the
 * whole horizon-and-floor group travels as one vertically and fans out only
 * horizontally.
 */
const HORIZON_PARALLAX_Y = 0.3;

/**
 * Back-to-front. `SynthwaveScene` renders wrappers in exactly this order, so DOM
 * order is the z-order and no layer ever carries a z-index.
 */
export const SCENE_LAYERS: readonly SceneLayer[] = [
	{ id: "sky", depth: 0 },
	{ id: "stars", depth: 0.05 },
	// The sun's disc sits *into* the horizon, so it joins the horizon group.
	{ id: "sun", depth: 0.12, parallaxY: HORIZON_PARALLAX_Y },
	{ id: "mountains-far", depth: 0.25, parallaxY: HORIZON_PARALLAX_Y },
	{ id: "skyline", depth: 0.35, parallaxY: HORIZON_PARALLAX_Y },
	{ id: "grid", depth: 0.55, parallaxY: HORIZON_PARALLAX_Y },
	{ id: "palm-back", depth: 0.7, parallaxY: HORIZON_PARALLAX_Y },
	{ id: "palm-front", depth: 0.85, parallaxY: HORIZON_PARALLAX_Y },
	{ id: "car", depth: 0.95, parallaxY: HORIZON_PARALLAX_Y },
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

/** Seconds for one full sun-halo breath (out and back). */
export const SUN_HALO_PULSE_SECONDS = 6;

/**
 * Palm sway. Each palm swings symmetrically between `-PALM_SWAY_DEGREES` and
 * `+PALM_SWAY_DEGREES` about its own base, so the source render's natural lean
 * stays the centre of the motion. The two periods share no factor, so the pair
 * only realigns once a minute instead of swaying in lockstep.
 */
export const PALM_SWAY_DEGREES = 0.8;
export const PALM_BACK_SWAY_SECONDS = 7;
export const PALM_FRONT_SWAY_SECONDS = 9;

/** Seconds for one tail-light glow breath. */
export const CAR_GLOW_PULSE_SECONDS = 2.4;
/**
 * Dimmest point of that breath. The glow's CSS rest state is fully lit, so the
 * no-JS and reduced-motion poses show the tail lights on, and only the tween
 * ever dips them.
 */
export const CAR_GLOW_MIN_OPACITY = 0.75;

/** Seconds for one atmosphere/fog drift cycle. */
export const FOG_DRIFT_SECONDS = 24;

/** Seconds for the grid to travel exactly one cell — the loop must be seamless. */
export const GRID_SCROLL_SECONDS = 3.2;

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
