<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/optical-disc/BasicUsage.svelte.
import { OpticalDisc } from "fancy-ui-vue";
</script>

<template>
	<div
		class="flex w-full items-center justify-center rounded-xl bg-gradient-to-b from-sky-500 to-sky-200 p-8"
	>
		<OpticalDisc alt="A spinning disc" class="max-w-xs" />
	</div>
</template>
