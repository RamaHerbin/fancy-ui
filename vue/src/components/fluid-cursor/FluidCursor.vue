<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { FluidCursorInitOptions, FluidCursorLiveOptions } from "./fluid-cursor-core.js";

/**
 * Every simulation prop is documented on `FluidCursorInitOptions` /
 * `FluidCursorLiveOptions` in `fluid-cursor-core.ts`. All of them but the
 * five live ones are read once, at mount: the engine snapshots the whole
 * set and never reacts to a later change. The five on
 * `FluidCursorLiveOptions` are the ones the running simulation keeps
 * re-reading, and the watcher below forwards them. `dev` is not part of the
 * public surface — the wrapper fills it in from the bundler.
 */
export interface FluidCursorProps
	extends Partial<Omit<FluidCursorInitOptions, "dev"> & FluidCursorLiveOptions> {
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { createFluidCursor, type FluidCursorEngine } from "./fluid-cursor-core.js";

defineOptions({ name: "FluidCursor", inheritAttrs: false });

/**
 * The bundler's dev flag, read through a local cast: the package's tsconfig
 * does not pull in the bundler client types, so `import.meta.env` is untyped
 * here. Statically replaced at build time exactly like a direct read.
 */
const DEV = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV ?? false;

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

onMounted(() => {
	const canvas = canvasRef.value;
	if (!canvas) return;
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
});

onBeforeUnmount(() => {
	engine?.destroy();
	engine = null;
});

// The running engine re-reads these five, exactly as the prop getters it
// replaced did. The watcher has no `immediate`, so it never runs on mount or
// on the server; onMounted owns the initial values.
watch(
	() => ({ fluidColor, fluidColors, contained, interactive, allowMultiple }),
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
			ref="canvas"
			:class="contained ? 'block h-full w-full' : 'block h-screen w-screen'"
		></canvas>
	</div>
</template>
