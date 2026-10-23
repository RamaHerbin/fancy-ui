<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { PixelSceneName } from "./pixel-scene-scenes.js";
import type { PixelSceneHdrLook } from "./pixel-scene-hdr.js";

export type { PixelSceneName };

/**
 * PixelScene — an animated pixel-art landscape on a dot grid.
 *
 * At rest only sparse ink dots and the lit cells show; a round lens that
 * follows the pointer reveals the picture in full colour, with a dithered
 * rim. Day and night are two complete palettes. On HDR displays the lit
 * cells (sun, moon, windows, stars, fireflies, the lens field) are redrawn
 * as hard squares brighter than SDR white in a WebGPU layer.
 *
 * The engine, the scenes and the HDR layer live in three framework-free
 * cores; this file owns the markup and pushes props into the engine. The
 * engine owns its observers, the reduced-motion query and the pointer
 * listeners.
 */
export interface PixelSceneProps {
	/** Which landscape to paint */
	scene?: PixelSceneName;
	/** Night palette (stars, moon, lit windows) instead of day. Never changed by the component. */
	night?: boolean;
	/** Grid pitch in CSS px (clamped 4–32; grows on very large boxes) */
	cell?: number;
	/** Square dot edge in CSS px, at most `cell` */
	dot?: number;
	/** Show full colour under a round lens that follows the pointer */
	lens?: boolean;
	/** Lens radius in cells */
	lensRadius?: number;
	/** On HDR displays, draw lit cells brighter than SDR white in a WebGPU layer */
	hdr?: boolean;
	/** HDR rendering: `calibrated` (glow 1 = the SDR dot, sRGB) or `vivid` (the prototype's hotter, display-p3 look) */
	hdrLook?: PixelSceneHdrLook;
	/** Colour of the resting dots; any CSS colour, `currentColor` resolved on the host */
	ink?: string;
	/** Freeze the scene's animations (the lens still follows the pointer) */
	paused?: boolean;
	/** Animate a change of `night` as a dithered wave from the sun (never under reduced motion) */
	wave?: boolean;
	/** `[day, night]` background painted by the scene itself; the wave carries it. Default: transparent */
	surfaces?: readonly [day: string, night: string];
	/** `[day, night]` dot colours, swapped by the wave; overrides `ink` */
	inks?: readonly [day: string, night: string];
	/** Additional classes on the host — give it a height */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useAttrs, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { createPixelScene, type PixelSceneEngine } from "./pixel-scene-core.js";
import { getScenePainter } from "./pixel-scene-scenes.js";
import {
	PIXEL_SCENE_HDR_RESTART_MS,
	PIXEL_SCENE_HDR_RESTARTS,
	pixelSceneHdrAvailable,
	startPixelSceneHdr,
} from "./pixel-scene-hdr.js";

defineOptions({ name: "PixelScene", inheritAttrs: false });
defineSlots<{ default?(): unknown }>();

const {
	scene = "alpine",
	night = false,
	cell = 5,
	dot = 4,
	lens = true,
	lensRadius = 21,
	hdr = true,
	hdrLook = "calibrated",
	ink = "currentColor",
	paused = false,
	wave = true,
	surfaces,
	inks,
	class: className,
} = defineProps<PixelSceneProps>();

const attrs = useAttrs();
const hostEl = useTemplateRef<HTMLDivElement>("host");
const canvasEl = useTemplateRef<HTMLCanvasElement>("canvas");
const hdrCanvas = useTemplateRef<HTMLCanvasElement>("hdrCanvas");
/** False on the server and the first client render: the HDR canvas appears only after mount. */
const mounted = ref(false);
const hdrCapable = ref(false);
const hdrOn = ref(false);
/** Bumped to start the HDR layer again after a device loss; the watcher below reads it. */
const hdrRun = ref(0);
let hdrRestarts = 0;
/** Set once the engine exists, so the HDR watcher can attach to it. */
const engineReady = ref(false);
/** Plain closure state on purpose: nothing rendered depends on the engine. */
let engine: PixelSceneEngine | null = null;

defineExpose({ ref: hostEl });

onMounted(() => {
	mounted.value = true;
	hdrCapable.value = hdr && pixelSceneHdrAvailable();
	const host = hostEl.value;
	const canvas = canvasEl.value;
	if (!host || !canvas) return;
	engine = createPixelScene(
		{ host, canvas },
		{
			painter: getScenePainter(scene),
			night,
			cell,
			dot,
			lens,
			lensRadius,
			ink,
			paused,
			wave,
			surfaces: surfaces ?? null,
			inks: inks ?? null,
		}
	);
	engineReady.value = engine !== null;
});

onBeforeUnmount(() => {
	engine?.destroy();
	engine = null;
	engineReady.value = false;
	mounted.value = false;
});

// --- live props: each watcher pushes its own keys; the engine ignores absent ones.
// A `watch` without `immediate` never fires for the initial values, which the
// mount call already passed.

watch(
	() => ({ painter: getScenePainter(scene), night }),
	(next) => engine?.setOptions(next),
	{ flush: "post" }
);

watch(
	() => ({ cell, dot }),
	(next) => engine?.setOptions(next),
	{ flush: "post" }
);

watch(
	() => ({
		lens,
		lensRadius,
		ink,
		paused,
		wave,
		surfaces: surfaces ?? null,
		inks: inks ?? null,
	}),
	(next) => engine?.setOptions(next),
	{ flush: "post" }
);

// HDR: decided after mount only, so SSR and hydration render the 2D canvas alone.
watch(
	() => hdr,
	(on) => {
		hdrCapable.value = mounted.value && on && pixelSceneHdrAvailable();
	}
);

watch(
	[hdrCanvas, engineReady, hdrCapable, hdrRun, () => hdrLook],
	([canvas, ready, capable], _old, onCleanup) => {
		if (!canvas || !ready || !capable) return;
		let cancelled = false;
		let stop: (() => void) | null = null;
		let retry: ReturnType<typeof setTimeout> | null = null;
		// A lost device usually comes back (GPU process restarted, driver reset):
		// start again after a growing pause, a few times, before giving the layer up.
		const restart = () => {
			if (hdrRestarts >= PIXEL_SCENE_HDR_RESTARTS) {
				hdrCapable.value = false;
				return;
			}
			hdrRestarts++;
			retry = setTimeout(() => {
				retry = null;
				hdrRun.value++;
			}, PIXEL_SCENE_HDR_RESTART_MS * hdrRestarts);
		};
		void startPixelSceneHdr(canvas, hdrLook).then((layer) => {
			if (cancelled || !engine) {
				layer?.destroy();
				return;
			}
			if (!layer) {
				// Nothing to start on the first try (no adapter, tone mapping refused): give
				// up at once. During a restart the GPU may still be on its way back.
				if (hdrRestarts === 0) hdrCapable.value = false;
				else restart();
				return;
			}
			const target = engine;
			target.setOptions({ onFrame: (frame) => layer.render(frame) });
			hdrOn.value = true;
			stop = () => {
				target.setOptions({ onFrame: null });
				layer.destroy();
				hdrOn.value = false;
			};
			void layer.lost.then(() => {
				if (cancelled) return;
				stop?.();
				stop = null;
				restart();
			});
		});
		onCleanup(() => {
			cancelled = true;
			stop?.();
			stop = null;
			if (retry !== null) clearTimeout(retry);
		});
	},
	{ flush: "post" }
);
</script>

<template>
	<div
		ref="host"
		:class="cn('pixel-scene relative overflow-hidden', className)"
		:data-scene="scene"
		:data-night="night ? '' : undefined"
		:data-hdr="hdrOn ? '' : undefined"
		v-bind="attrs"
	>
		<canvas
			ref="canvas"
			class="pointer-events-none absolute inset-0 block h-full w-full"
			aria-hidden="true"
		></canvas>
		<!-- Lit cells above SDR white, over the 2D picture, on HDR displays only. -->
		<canvas
			v-if="hdrCapable"
			ref="hdrCanvas"
			class="pixel-scene__hdr pointer-events-none absolute inset-0 block h-full w-full"
			aria-hidden="true"
		></canvas>
		<div v-if="$slots.default" class="pixel-scene__content relative z-[1] h-full w-full">
			<slot />
		</div>
	</div>
</template>
