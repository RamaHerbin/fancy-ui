<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface FallingStarsBgProps {
	/** Star color as hex string */
	color?: string;
	/** Number of stars */
	count?: number;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { createFallingStars, type FallingStarsEngine } from "./bg-falling-stars-core.js";

defineOptions({ name: "FallingStarsBg", inheritAttrs: false });

const { color = "#FFF", count = 200, class: className } = defineProps<FallingStarsBgProps>();

const canvasRef = useTemplateRef<HTMLCanvasElement>("canvas");
let engine: FallingStarsEngine | null = null;
let resizeObserver: ResizeObserver | null = null;

watch(
	() => color,
	(nextColor) => {
		engine?.setOptions({ color: nextColor });
	},
	{ flush: "post" }
);

onMounted(() => {
	const canvas = canvasRef.value;
	if (!canvas) return;

	engine = createFallingStars({ canvas }, { count, color });

	resizeObserver = new ResizeObserver(() => engine?.resize());
	resizeObserver.observe(canvas);
});

onBeforeUnmount(() => {
	engine?.destroy();
	resizeObserver?.disconnect();
});
</script>

<template>
	<canvas ref="canvas" :class="cn('absolute inset-0 h-full w-full', className)"></canvas>
</template>
