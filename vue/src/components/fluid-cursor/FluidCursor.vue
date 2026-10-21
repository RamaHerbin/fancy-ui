<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { FluidCursorInitOptions, FluidCursorLiveOptions } from "./fluid-cursor-core.js";

/**
 * Every simulation prop is documented on `FluidCursorInitOptions` /
 * `FluidCursorLiveOptions` in `fluid-cursor-core.ts`. All of them but the
 * six live ones are read once, at mount: the engine snapshots the whole
 * set and never reacts to a later change. The six on
 * `FluidCursorLiveOptions` are the ones the running simulation keeps
 * re-reading, and the watcher below forwards them. `dev` is not part of the
 * public surface — the wrapper fills it in from the bundler.
 */
export interface FluidCursorProps extends Partial<
	Omit<FluidCursorInitOptions, "dev"> & FluidCursorLiveOptions
> {
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from "vue";
import { createReducedMotion } from "../../internals/motion/media-query.js";
import { cn } from "../../utils.js";
import { isDev as DEV } from "../../internals/env.js";
import { createFluidCursor, type FluidCursorEngine } from "./fluid-cursor-core.js";

defineOptions({ name: "FluidCursor", inheritAttrs: false });

const {
	simResolution = 128,
	dyeResolution = 1440,
	captureResolution = 512,
	densityDissipation = 3.5,
	velocityDissipation = 2,
	pressure = 0.1,
	pressureIterations = 20,
	curl = 3,
	splatRadius = 0.2,
	splatForce = 6000,
	shading = true,
	colorUpdateSpeed = 10,
	backColor = { r: 0.5, g: 0, b: 0 },
	transparent = true,
	fluidColor,
	fluidColors,
	colorIntensity = 0.15,
	class: className = "",
	autoSplat = false,
	autoSplatInterval = 1500,
	interactive = true,
	pauseWhenHidden = true,
	splatOnMount = false,
	allowMultiple = false,
	contained = true,
	hdr = false,
	hdrBoost = 1.5,
	dither = false,
	ditherPixelSize = 3,
	ditherLevels = 4,
	onReady,
} = defineProps<FluidCursorProps>();

const canvasRef = useTemplateRef<HTMLCanvasElement>("canvas");
/** Plain closure state on purpose: nothing rendered depends on the engine. */
let engine: FluidCursorEngine | null = null;

// `prefers-reduced-motion: reduce` means no simulation at all: no engine,
// so no rAF loop, no pointer listeners and no GPU context. The layer stays
// as an empty, pointer-transparent canvas. A live change of the preference
// stops or starts the simulation without a remount.
const reducedMotion = createReducedMotion();
let stopReducedMotion: (() => void) | null = null;
/** The element the running engine was created on. */
let engineCanvas: HTMLCanvasElement | null = null;

function stopEngine() {
	engine?.destroy();
	engine = null;
	engineCanvas = null;
}

/**
 * Bring the engine in line with the preference and the current canvas. The
 * canvas is keyed on the preference in the template, so each start gets a
 * fresh element (a destroyed engine has lost its context, which the same
 * element cannot hand out again) and a stop leaves a blank one, not a frozen
 * frame. Props are read at call time, so a restart uses their current values.
 */
function syncEngine() {
	const canvas = canvasRef.value;
	if (reducedMotion.current || !canvas) {
		stopEngine();
		return;
	}
	if (engine && engineCanvas === canvas) return;
	stopEngine();
	engineCanvas = canvas;
	engine = createFluidCursor(
		{ canvas },
		{
			simResolution,
			dyeResolution,
			captureResolution,
			densityDissipation,
			velocityDissipation,
			pressure,
			pressureIterations,
			curl,
			splatRadius,
			splatForce,
			shading,
			colorUpdateSpeed,
			backColor,
			transparent,
			fluidColor,
			fluidColors,
			colorIntensity,
			autoSplat,
			autoSplatInterval,
			interactive,
			pauseWhenHidden,
			splatOnMount,
			allowMultiple,
			contained,
			hdr,
			hdrBoost,
			dither,
			ditherPixelSize,
			ditherLevels,
			onReady,
			dev: DEV,
		}
	);
}

onMounted(() => {
	stopReducedMotion = reducedMotion.start();
	syncEngine();
});

// No `immediate`: onMounted owns the first sync. `post` so the keyed canvas
// has been swapped (and the template ref updated) before the engine follows.
watch(
	[() => reducedMotion.current, canvasRef],
	() => {
		syncEngine();
	},
	{ flush: "post" }
);

onBeforeUnmount(() => {
	stopReducedMotion?.();
	stopReducedMotion = null;
	stopEngine();
});

// The running engine re-reads these six, exactly as the prop getters it
// replaced did. The watcher has no `immediate`, so it never runs on mount or
// on the server; onMounted owns the initial values.
watch(
	() => ({ fluidColor, fluidColors, contained, interactive, allowMultiple, onReady }),
	(next) => {
		engine?.setOptions(next);
	},
	{ flush: "post" }
);
</script>

<template>
	<div
		:class="
			cn(
				contained
					? 'pointer-events-none absolute inset-0 h-full w-full'
					: 'pointer-events-none fixed top-0 left-0 z-50 size-full',
				className
			)
		"
	>
		<canvas
			:key="reducedMotion.current ? 'static' : 'live'"
			ref="canvas"
			:class="contained ? 'block h-full w-full' : 'block h-screen w-screen'"
		></canvas>
	</div>
</template>
