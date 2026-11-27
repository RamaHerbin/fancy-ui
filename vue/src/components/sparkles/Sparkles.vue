<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * Sparkles - canvas-based floating particle sparkle effect
 *
 * Particles drift across a percentage-space field (0-100 on both axes, wrapping
 * at -2/102) and pulse their alpha off a per-particle sine phase. Everything is
 * drawn on a 2D canvas from a `requestAnimationFrame` loop; the canvas is sized
 * from the container's `getBoundingClientRect()` scaled by `devicePixelRatio`
 * and kept in sync by a `ResizeObserver` on the container.
 *
 * The component fills its parent (`size-full`), so give the parent a height.
 */
export interface SparklesProps {
	/** Background color */
	background?: string;
	/** Particle color */
	particleColor?: string;
	/** Minimum particle size */
	minSize?: number;
	/** Maximum particle size */
	maxSize?: number;
	/** Particle movement speed */
	speed?: number;
	/** Number of particles */
	particleDensity?: number;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { useReducedMotion } from "../../internals/motion/use-media-query.js";
import { createSparkles, type SparklesEngine } from "./sparkles-core.js";

defineOptions({ name: "Sparkles", inheritAttrs: false });

const {
	class: className,
	background = "#0d47a1",
	particleColor = "#ffffff",
	minSize = 1,
	maxSize = 3,
	speed = 4,
	particleDensity = 120,
} = defineProps<SparklesProps>();

const containerRef = useTemplateRef<HTMLDivElement>("containerRef");
const canvasRef = useTemplateRef<HTMLCanvasElement>("canvasRef");
let engine: SparklesEngine | null = null;
let resizeObserver: ResizeObserver | null = null;

// Live preference. Called before `onMounted` so its own mount hook (which starts the
// media query) runs first and the first frame already knows.
const reducedMotion = useReducedMotion();

onMounted(() => {
	if (!canvasRef.value || !containerRef.value) return;

	engine = createSparkles(
		{ canvas: canvasRef.value, container: containerRef.value },
		{ minSize, maxSize, speed, particleDensity, particleColor, reducedMotion: reducedMotion.value }
	);

	resizeObserver = new ResizeObserver(() => engine?.resize());
	resizeObserver.observe(containerRef.value);
});

onBeforeUnmount(() => {
	resizeObserver?.disconnect();
	resizeObserver = null;
	engine?.destroy();
	engine = null;
});

watch(
	() => particleColor,
	(color) => engine?.setOptions({ particleColor: color }),
	{ flush: "post" }
);

// Reduced motion: one still frame; the loop wakes when the preference clears.
watch(
	reducedMotion,
	(next) => {
		engine?.setOptions({ reducedMotion: next });
	},
	{ flush: "post" }
);
</script>

<template>
	<div
		ref="containerRef"
		:class="cn('relative size-full overflow-hidden will-change-transform', className)"
		:style="{ background }"
	>
		<canvas ref="canvasRef" class="absolute inset-0 size-full" aria-hidden="true"></canvas>
	</div>
</template>
