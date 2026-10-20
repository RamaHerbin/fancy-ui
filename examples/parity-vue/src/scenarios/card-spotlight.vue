<script setup lang="ts">
// Mirrors src/lib/components/docs/DemoRenderer.svelte, slug "card-spotlight":
// <CardSpotlight class="h-64 w-80" gradientColor="#262626"> (non-retro skin).
import { CardSpotlight } from "fancy-ui-vue";
</script>

<template>
	<CardSpotlight class="h-64 w-80" gradient-color="#262626">
		<div class="relative z-20 p-6">
			<h3 class="text-foreground text-lg font-bold">Card Spotlight</h3>
			<p class="text-muted-foreground mt-2 text-sm">Mouse-following radial gradient effect.</p>
		</div>
	</CardSpotlight>
</template>
