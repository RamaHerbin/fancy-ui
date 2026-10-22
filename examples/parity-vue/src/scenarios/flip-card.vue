<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/flip-card/BasicUsage.svelte.
import { FlipCard } from "fancy-ui-vue";
</script>

<template>
	<FlipCard>
		<div
			class="flex size-full items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500"
		>
			<p class="text-2xl font-bold text-white">Front</p>
		</div>
		<template #back>
			<div class="flex size-full flex-col items-center justify-center">
				<p class="text-lg font-semibold">Back Side</p>
				<p class="text-muted-foreground mt-2 text-sm">Hover, focus or tap to flip</p>
			</div>
		</template>
	</FlipCard>
</template>
