<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface FallingStarsBgProps {
	/** Star color: a hex string, or `currentColor` (default) to follow the text colour */
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
import { useReducedMotion } from "../../internals/motion/use-media-query.js";
import { createFallingStars, type FallingStarsEngine } from "./bg-falling-stars-core.js";

defineOptions({ name: "FallingStarsBg", inheritAttrs: false });

const {
	color = "currentColor",
	count = 200,
	class: className,
} = defineProps<FallingStarsBgProps>();

const canvasRef = useTemplateRef<HTMLCanvasElement>("canvas");
let engine: FallingStarsEngine | null = null;
let resizeObserver: ResizeObserver | null = null;

// Live preference. Called before `onMounted` so its own mount hook (which starts the
// media query) runs first and the first frame already knows.
const reducedMotion = useReducedMotion();

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

	engine = createFallingStars({ canvas }, { count, color, reducedMotion: reducedMotion.value });

	resizeObserver = new ResizeObserver(() => engine?.resize());
	resizeObserver.observe(canvas);
});

onBeforeUnmount(() => {
	engine?.destroy();
	resizeObserver?.disconnect();
});

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
	<canvas ref="canvas" :class="cn('absolute inset-0 h-full w-full', className)"></canvas>
</template>
