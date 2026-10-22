<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/compare/BasicUsage.svelte.
import { Compare } from "fancy-ui-vue";
</script>

<template>
	<div class="flex justify-center">
		<Compare
			first-image="https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?w=800&q=80"
			second-image="https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80"
			first-image-alt="Forest in autumn"
			second-image-alt="Mountains at sunrise"
			class="rounded-lg"
		/>
	</div>
</template>
