<script setup lang="ts">
// Mirrors src/lib/components/docs/DemoRenderer.svelte, slug "confetti":
// <ConfettiButton> carrying the "Click for Confetti" label as plain content.
import { ConfettiButton } from "fancy-ui-vue";
</script>

<template>
	<ConfettiButton class="bg-foreground text-background rounded-md px-4 py-2 text-sm font-medium">
		Click for Confetti
	</ConfettiButton>
</template>
