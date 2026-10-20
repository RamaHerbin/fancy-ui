<script setup lang="ts">
// Mirrors src/lib/components/docs/DemoRenderer.svelte, slug "flickering-grid":
// <FlickeringGrid color="#6366f1" maxOpacity={0.2} squareSize={4} gridGap={6} /> (defaultProps).
import { FlickeringGrid } from "fancy-ui-vue";
</script>

<template>
	<FlickeringGrid color="#6366f1" :max-opacity="0.2" :square-size="4" :grid-gap="6" />
</template>
