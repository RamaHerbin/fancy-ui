<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface MatrixRainProps {
	color?: string;
	speed?: number;
	density?: number;
	glyphSize?: number;
	fadeOpacity?: number;
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { createMatrixRain, type MatrixRainEngine } from "./matrix-rain-core.js";

defineOptions({ name: "MatrixRain", inheritAttrs: false });

const {
	color = "#00ff41",
	speed = 1.0,
	density = 1.0,
	glyphSize = 16,
	fadeOpacity = 0.05,
	class: className,
} = defineProps<MatrixRainProps>();

const canvasRef = useTemplateRef<HTMLCanvasElement>("canvas");
let engine: MatrixRainEngine | null = null;
let observer: ResizeObserver | null = null;

// Mount only: the engine lives for the component's lifetime. The initial
// option snapshot is read once here — the same "no prop change tears the
// engine down" guarantee the Svelte wrapper gets from reading inside
// `untrack`. Later prop changes are carried by the two watchers below.
onMounted(() => {
	const canvas = canvasRef.value;
	if (!canvas) return;

	engine = createMatrixRain({ canvas }, { color, speed, density, glyphSize, fadeOpacity });
	if (!engine) return;

	observer = new ResizeObserver(() => engine?.resize());
	observer.observe(canvas);
});

onBeforeUnmount(() => {
	observer?.disconnect();
	observer = null;
	engine?.destroy();
	engine = null;
});

// Per-frame appearance props: applied in place, no relayout.
watch(
	() => [color, speed, fadeOpacity] as const,
	([nextColor, nextSpeed, nextFadeOpacity]) => {
		engine?.setOptions({ color: nextColor, speed: nextSpeed, fadeOpacity: nextFadeOpacity });
	},
	{ flush: "post" }
);

// Layout props: the engine relayouts the column grid when either changes.
watch(
	() => [glyphSize, density] as const,
	([nextGlyphSize, nextDensity]) => {
		engine?.setOptions({ glyphSize: nextGlyphSize, density: nextDensity });
	},
	{ flush: "post" }
);
</script>

<template>
	<canvas ref="canvas" :class="cn('block h-full w-full bg-black', className)"></canvas>
</template>
