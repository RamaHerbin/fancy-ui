<script setup lang="ts">
// Mirrors src/lib/components/docs/DemoRenderer.svelte, slug "confetti":
// <ConfettiButton> is itself the button, so it carries the classes and the label.
import { ConfettiButton } from "fancy-ui-vue";
</script>

<template>
	<ConfettiButton class="bg-foreground text-background rounded-md px-4 py-2 text-sm font-medium">
		Click for Confetti
	</ConfettiButton>
</template>
