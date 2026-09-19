<script setup lang="ts">
import { onMounted, useTemplateRef } from "vue";
import { cn } from "fancy-ui-vue";

// No library components exist yet (scaffold-only wave). This block stands in
// for a canvas component that will land here later. The canvas element is
// only touched in onMounted so `nuxt generate` never runs canvas code on the
// server (no canvas context exists there).
const canvasRef = useTemplateRef<HTMLCanvasElement>("canvas");

onMounted(() => {
	const canvas = canvasRef.value;
	const ctx = canvas?.getContext("2d");
	if (!ctx || !canvas) return;
	ctx.fillStyle = "#888";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
});
</script>

<template>
	<main :class="cn('mx-auto max-w-2xl p-8')">
		<h1 :class="cn('text-2xl font-semibold')">canvas</h1>
		<canvas ref="canvas" :class="cn('mt-4 rounded-md border border-neutral-300')" width="320" height="120" />
	</main>
</template>
