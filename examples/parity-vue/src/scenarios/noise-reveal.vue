<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/noise-reveal/BasicUsage.svelte.
import { ref } from "vue";
import { NoiseReveal } from "fancy-ui-vue";

const revealed = ref(true);
</script>

<template>
	<div class="flex w-full flex-col items-center gap-4">
		<NoiseReveal
			src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80"
			alt="Mountain peak above the clouds"
			trigger="manual"
			:revealed="revealed"
			class="h-[300px] max-w-md"
		/>
		<button
			class="bg-foreground text-background rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
			@click="revealed = !revealed"
		>
			{{ revealed ? "Hide" : "Reveal" }} image
		</button>
	</div>
</template>
