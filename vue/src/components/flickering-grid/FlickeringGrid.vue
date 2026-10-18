<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * FlickeringGrid - Canvas-based grid with flickering opacity squares
 *
 * Uses ResizeObserver, IntersectionObserver, and requestAnimationFrame
 * for performant rendering with automatic pause when off-screen.
 */
export interface FlickeringGridProps {
	/** Size of each grid square in pixels */
	squareSize?: number;
	/** Gap between squares in pixels */
	gridGap?: number;
	/** Probability of a square changing opacity each second (0-1) */
	flickerChance?: number;
	/** Color of the squares (hex format) */
	color?: string;
	/** Maximum opacity of squares (0-1) */
	maxOpacity?: number;
	/** Fixed width in pixels (defaults to container width) */
	width?: number;
	/** Fixed height in pixels (defaults to container height) */
	height?: number;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { createFlickeringGrid, type FlickeringGridEngine } from "./flickering-grid-core.js";

defineOptions({ name: "FlickeringGrid", inheritAttrs: false });

const {
	squareSize = 4,
	gridGap = 6,
	flickerChance = 0.3,
	color = "#000000",
	maxOpacity = 0.3,
	width,
	height,
	class: className,
} = defineProps<FlickeringGridProps>();

const containerRef = useTemplateRef<HTMLDivElement>("container");
const canvasRef = useTemplateRef<HTMLCanvasElement>("canvas");
let engine: FlickeringGridEngine | null = null;
let resizeObserver: ResizeObserver | null = null;
let intersectionObserver: IntersectionObserver | null = null;

watch(
	() => ({ squareSize, gridGap, flickerChance, color, maxOpacity, width, height }),
	(next) => {
		engine?.setOptions(next);
	},
	{ flush: "post" }
);

onMounted(() => {
	const container = containerRef.value;
	const canvas = canvasRef.value;
	if (!container || !canvas) return;

	engine = createFlickeringGrid(
		{ container, canvas },
		{ squareSize, gridGap, flickerChance, color, maxOpacity, width, height }
	);
	if (!engine) return;

	resizeObserver = new ResizeObserver(() => {
		engine?.resize();
	});

	intersectionObserver = new IntersectionObserver(
		(entries) => {
			const entry = entries[0];
			if (!entry) return;
			engine?.setInView(entry.isIntersecting);
		},
		{ threshold: 0 }
	);

	resizeObserver.observe(container);
	intersectionObserver.observe(canvas);
});

onBeforeUnmount(() => {
	resizeObserver?.disconnect();
	intersectionObserver?.disconnect();
	engine?.destroy();
	engine = null;
});
</script>

<template>
	<div ref="container" :class="cn('h-full w-full', className)">
		<canvas ref="canvas" class="pointer-events-none"></canvas>
	</div>
</template>
