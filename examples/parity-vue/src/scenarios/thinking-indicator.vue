<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/thinking-indicator/BasicUsage.svelte.
import { ThinkingIndicator } from "fancy-ui-vue";

const startedAt = Date.now();
</script>

<template>
	<div class="flex w-full flex-col items-start gap-6">
		<ThinkingIndicator status="Reading files" :since="startedAt" />

		<ThinkingIndicator variant="pill" status="Searching the web" :since="startedAt - 8000" />

		<ThinkingIndicator status="Reading files" :running="false" :show-elapsed="false">
			<template #done>Thought for 12s</template>
		</ThinkingIndicator>
	</div>
</template>
