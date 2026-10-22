<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/editorial-engine/BasicUsage.svelte.
import { EditorialEngine } from "fancy-ui-vue";
</script>

<template>
	<div class="h-[600px] w-full overflow-hidden rounded-lg border">
		<EditorialEngine />
	</div>
	<p class="text-muted-foreground mt-3 text-xs">
		Drag an orb — text reflows around it every frame. Click an orb to pause its drift.
	</p>
</template>
