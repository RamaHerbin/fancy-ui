<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/fluid-cursor/BasicUsage.svelte.
import { FluidCursor } from "fancy-ui-vue";
</script>

<template>
	<div class="relative h-64 w-full overflow-hidden rounded-lg border">
		<FluidCursor />
		<div class="pointer-events-none absolute inset-0 flex items-center justify-center">
			<p class="text-muted-foreground text-sm select-none">Move your cursor here</p>
		</div>
	</div>
</template>
