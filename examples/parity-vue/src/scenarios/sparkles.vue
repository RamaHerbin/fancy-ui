<script setup lang="ts">
// Mirrors src/lib/components/docs/DemoRenderer.svelte, slug "sparkles": the `defaultProps`
// (dark backdrop, currentColor particles, density 160, text-white) inside the `previewBox` stage.
import { Sparkles } from "fancy-ui-vue";
</script>

<template>
	<div data-demo-stage class="relative flex h-[300px] w-full items-center justify-center">
		<Sparkles
			background="#0b1020"
			particle-color="currentColor"
			:particle-density="160"
			class="text-white"
		/>
	</div>
</template>
