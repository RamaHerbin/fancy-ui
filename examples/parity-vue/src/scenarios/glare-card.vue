<script setup lang="ts">
// Mirrors src/lib/components/docs/DemoRenderer.svelte, slug "glare-card":
// <GlareCard> with a centred bold "Glare Card" label.
import { GlareCard } from "fancy-ui-vue";
</script>

<template>
	<GlareCard>
		<div class="flex h-full items-center justify-center p-6">
			<p class="text-foreground text-lg font-bold">Glare Card</p>
		</div>
	</GlareCard>
</template>
