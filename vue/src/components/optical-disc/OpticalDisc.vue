<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface OpticalDiscProps {
	/** Image printed on the label side. Omit for the built-in blank label. */
	label?: string;
	/** Accessible name. Without it the disc is decorative and hidden from assistive tech. */
	alt?: string;
	/** Seconds per full turn. 0 keeps the disc still; negative turns the other way. */
	spin?: number;
	/** Starting angle in degrees. 0 faces the label to the viewer, 180 the mirror. */
	angle?: number;
	/** Lean of the spin axis toward the viewer, in degrees. */
	tilt?: number;
	/** Strength of the diffraction colours. 0 leaves a plain mirror. */
	iridescence?: number;
	/** Track pitch in nanometres. Smaller spreads the colours wider. */
	pitch?: number;
	/** Label paper colour, `#rgb` or `#rrggbb`. */
	labelColor?: string;
	/** Tint of the clear hub, `#rgb` or `#rrggbb`. */
	tint?: string;
	/** Drag to turn the disc. */
	interactive?: boolean;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { useReducedMotion } from "../../internals/motion/use-media-query.js";
import {
	createOpticalDisc,
	fallbackBackground,
	OPTICAL_DISC_DEFAULTS,
	type OpticalDiscEngine,
} from "./optical-disc-core.js";

defineOptions({ name: "OpticalDisc", inheritAttrs: false });

const {
	label,
	alt,
	spin = OPTICAL_DISC_DEFAULTS.spin,
	angle = OPTICAL_DISC_DEFAULTS.angle,
	tilt = OPTICAL_DISC_DEFAULTS.tilt,
	iridescence = OPTICAL_DISC_DEFAULTS.iridescence,
	pitch = OPTICAL_DISC_DEFAULTS.pitch,
	labelColor = OPTICAL_DISC_DEFAULTS.labelColor,
	tint = OPTICAL_DISC_DEFAULTS.tint,
	interactive = true,
	class: className = "",
} = defineProps<OpticalDiscProps>();

const canvasRef = useTemplateRef<HTMLCanvasElement>("canvas");

// A ref, not a plain local: the fallback leaves the tree once the engine runs.
const engine = shallowRef<OpticalDiscEngine | null>(null);

// `matchMedia` is only asked from `onMounted`, so nothing is read on the server.
const reducedMotion = useReducedMotion();

function liveOptions() {
	return {
		label: label ?? null,
		spin,
		tilt,
		iridescence,
		pitch,
		labelColor,
		tint,
		interactive,
		reducedMotion: reducedMotion.value,
	};
}

// One engine per mount: every prop is live except the starting angle, which
// only means something at creation. Called from a lifecycle hook, so the reads
// here are untracked by construction.
onMounted(() => {
	const canvas = canvasRef.value;
	if (!canvas) return;
	engine.value = createOpticalDisc({ canvas }, { ...liveOptions(), angle });
});

onBeforeUnmount(() => {
	const instance = engine.value;
	if (!instance) return;
	engine.value = null;
	instance.destroy();
});

watch(
	[engine, liveOptions],
	([currentEngine, options]) => {
		currentEngine?.setOptions(options);
	},
	{ flush: "post" }
);
</script>

<template>
	<div
		v-bind="$attrs"
		:class="cn('fancy-optical-disc relative aspect-square w-full', className)"
		:role="alt ? 'img' : undefined"
		:aria-label="alt"
		:aria-hidden="alt ? undefined : 'true'"
		:data-ready="engine ? '' : undefined"
	>
		<!-- Shown on the server, before the first frame, and when WebGL is unavailable. -->
		<div
			v-if="!engine"
			class="fancy-optical-disc-fallback absolute inset-[12%] rounded-full"
			:style="{ background: fallbackBackground(labelColor) }"
		></div>
		<canvas
			ref="canvas"
			class="absolute inset-0 block h-full w-full"
			:style="interactive ? { touchAction: 'pan-y', cursor: 'grab' } : undefined"
		></canvas>
	</div>
</template>
