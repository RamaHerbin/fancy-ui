<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { MosaicGlowIdle } from "./mosaic-glow-core.js";

export type { MosaicGlowIdle };

/**
 * MosaicGlow — a cursor-lit canvas mosaic.
 *
 * A dark surface tiled with small squares. A soft halo follows the pointer
 * with a slight lag and lights the tiles under it to random intensities; lit
 * tiles fade slowly so the pointer leaves a comet trail. An additive bloom
 * bleeds over the gaps, a glassy highlight sits on every tile, and a
 * scattering of faint tiles stays visible outside the halo. With nobody
 * pointing, the halo drifts on its own.
 *
 * The canvas loop itself lives in `mosaic-glow-core.ts`; this file owns the
 * markup, the reduced-motion query and the two observers.
 */
export interface MosaicGlowProps {
	/** Additional classes on the host */
	class?: HTMLAttributes["class"];
	/** Tile edge in CSS px */
	tileSize?: number;
	/** Gap between tiles in CSS px */
	gap?: number;
	/** Halo / tile colour — hex or rgb() */
	color?: string;
	/** Surface colour behind the tiles — hex or rgb() */
	background?: string;
	/** Halo radius in CSS px */
	radius?: number;
	/** Overall brightness of lit tiles, 0–1 */
	intensity?: number;
	/** How long lit tiles linger after the halo moves on, 0–1 */
	trail?: number;
	/** Pointer lag, 0 (instant) to 1 (very laggy) */
	smoothing?: number;
	/** Spread of per-tile random brightness inside the halo, 0–1 */
	noise?: number;
	/** Visibility of the random faint tiles outside the halo, 0–1 */
	ambient?: number;
	/** Slowly re-roll the faint tiles over time */
	flicker?: boolean;
	/** What the halo does with no pointer: wander on its own or switch off */
	idle?: MosaicGlowIdle;
	/** Follow the pointer. Off leaves only the idle behaviour. */
	interactive?: boolean;
	/** Seed for the per-tile randomness — same seed, same mosaic */
	seed?: number;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useAttrs, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { useReducedMotion } from "../../internals/motion/use-media-query.js";
import {
	clamp01,
	createMosaicGlow,
	normalizeGap,
	normalizeRadius,
	normalizeTileSize,
	type MosaicGlowEngine,
} from "./mosaic-glow-core.js";

defineOptions({ name: "MosaicGlow", inheritAttrs: false });
defineSlots<{ default?(): unknown }>();

const {
	class: className,
	tileSize = 18,
	gap = 2,
	color = "#f2c318",
	background = "#0a0a0a",
	radius = 170,
	intensity = 1,
	trail = 0.6,
	smoothing = 0.15,
	noise = 0.7,
	ambient = 0.35,
	flicker = true,
	idle = "drift",
	interactive = true,
	seed = 1,
} = defineProps<MosaicGlowProps>();

// Clamped here as well as inside the engine: the watchers below depend on the
// clamped values, so a prop that moves but clamps to the same number never
// rebuilds the grid or repaints.
const intensityC = computed(() => clamp01(intensity));
const trailC = computed(() => clamp01(trail));
const smoothingC = computed(() => clamp01(smoothing));
const noiseC = computed(() => clamp01(noise));
const ambientC = computed(() => clamp01(ambient));
const radiusC = computed(() => normalizeRadius(radius));
const tileC = computed(() => normalizeTileSize(tileSize));
const gapC = computed(() => normalizeGap(gap));

const attrs = useAttrs();
const reducedMotion = useReducedMotion();
const hostEl = useTemplateRef<HTMLDivElement>("host");
const canvasEl = useTemplateRef<HTMLCanvasElement>("canvas");
/** Plain closure state on purpose: nothing rendered depends on the engine. */
let engine: MosaicGlowEngine | null = null;
let ro: ResizeObserver | undefined;
let io: IntersectionObserver | undefined;

defineExpose({ ref: hostEl });

// --- mount: engine and observers ---------------------------------------------

onMounted(() => {
	const host = hostEl.value;
	const canvas = canvasEl.value;
	if (!host || !canvas) return;

	// `useReducedMotion()` registered its own `onMounted` during setup, so the
	// query has already been asked by the time this hook runs.
	engine = createMosaicGlow(
		{ host, canvas },
		{
			tileSize: tileC.value,
			gap: gapC.value,
			color,
			background,
			radius: radiusC.value,
			intensity: intensityC.value,
			trail: trailC.value,
			smoothing: smoothingC.value,
			noise: noiseC.value,
			ambient: ambientC.value,
			flicker,
			idle,
			interactive,
			seed,
			reducedMotion: reducedMotion.value,
		}
	);
	if (!engine) return;

	if (typeof ResizeObserver !== "undefined") {
		// The engine ignores a resize that moved neither the box nor the pixel ratio.
		ro = new ResizeObserver(() => engine?.resize());
		ro.observe(host);
	}

	if (typeof IntersectionObserver !== "undefined") {
		io = new IntersectionObserver(
			([entry]) => {
				if (entry) engine?.setOptions({ visible: entry.isIntersecting });
			},
			{ rootMargin: "128px" }
		);
		io.observe(host);
	}
});

onBeforeUnmount(() => {
	engine?.destroy();
	engine = null;
	ro?.disconnect();
	ro = undefined;
	io?.disconnect();
	io = undefined;
});

// --- live props: one watcher per concern -------------------------------------

// Structural props rebuild the grid (heat resets — acceptable, it is structural).
// A `watch` without `immediate` never fires for the initial values, which is
// what the Svelte effect's `structuralInit` guard buys by hand.
watch(
	() => ({
		tileSize: tileC.value,
		gap: gapC.value,
		seed,
		noise: noiseC.value,
		ambient: ambientC.value,
	}),
	(next) => engine?.setOptions(next),
	{ flush: "post" }
);

watch(
	() => ({ color, background }),
	(next) => engine?.setOptions(next),
	{ flush: "post" }
);

// Loop- and paint-affecting props: restart a stopped loop, repaint a static frame.
watch(
	() => ({ idle, flicker, radius: radiusC.value, intensity: intensityC.value }),
	(next) => engine?.setOptions(next),
	{ flush: "post" }
);

// Read by the next frame; nothing to schedule or repaint.
watch(
	() => ({ trail: trailC.value, smoothing: smoothingC.value }),
	(next) => engine?.setOptions(next),
	{ flush: "post" }
);

watch(
	reducedMotion,
	(rm) => engine?.setOptions({ reducedMotion: rm }),
	{ flush: "post" }
);

watch(
	() => interactive,
	(on) => engine?.setOptions({ interactive: on }),
	{ flush: "post" }
);
</script>

<template>
	<div
		ref="host"
		:class="cn('mosaic-glow relative overflow-hidden', className)"
		:style="{ backgroundColor: background }"
		v-bind="attrs"
	>
		<canvas
			ref="canvas"
			class="pointer-events-none absolute inset-0 block h-full w-full"
			aria-hidden="true"
		></canvas>
		<div v-if="$slots.default" class="mosaic-glow__content relative z-[1] h-full w-full">
			<slot />
		</div>
	</div>
</template>
