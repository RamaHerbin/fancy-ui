<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface InteractiveGridPatternProps {
	/** Additional CSS classes for the SVG container */
	class?: HTMLAttributes["class"];
	/** Additional CSS classes for individual squares */
	squaresClassName?: string;
	/** Additional CSS classes controlling the square outline color */
	strokeClassName?: string;
	/** Width of each square in pixels */
	width?: number;
	/** Height of each square in pixels */
	height?: number;
	/** Grid dimensions [columns, rows] */
	squares?: [number, number];
	/** Whether squares respond to hover. When false, renders a static graph-paper grid with no listeners */
	interactive?: boolean;
}
</script>

<script setup lang="ts">
import { computed, ref } from "vue";
import { cn } from "../../utils.js";

defineOptions({ name: "InteractiveGridPattern", inheritAttrs: false });

const {
	class: className,
	squaresClassName,
	strokeClassName = "stroke-gray-400/30",
	width = 40,
	height = 40,
	squares = [24, 24] as [number, number],
	interactive = true,
} = defineProps<InteractiveGridPatternProps>();

const hoveredSquare = ref<number | null>(null);

const cols = computed(() => squares[0]);
const rows = computed(() => squares[1]);
const totalSquares = computed(() => cols.value * rows.value);
const gridWidth = computed(() => width * cols.value);
const gridHeight = computed(() => height * rows.value);

function getX(index: number) {
	return (index % cols.value) * width;
}

function getY(index: number) {
	return Math.floor(index / cols.value) * height;
}
</script>

<template>
	<svg
		:width="gridWidth"
		:height="gridHeight"
		:class="cn('absolute inset-0 h-full w-full border border-gray-400/30', className)"
	>
		<rect
			v-for="(_, index) in totalSquares"
			:key="index"
			:x="getX(index)"
			:y="getY(index)"
			:width="width"
			:height="height"
			:class="
				cn(
					'interactive-grid-square transition-all duration-100 ease-in-out',
					strokeClassName,
					hoveredSquare === index ? 'fill-gray-300/30' : 'fill-transparent',
					squaresClassName
				)
			"
			@mouseenter="interactive ? (hoveredSquare = index) : undefined"
			@mouseleave="interactive ? (hoveredSquare = null) : undefined"
		/>
	</svg>
</template>

<style scoped>
.interactive-grid-square:not(:hover) {
	transition-duration: 1000ms;
}
</style>
