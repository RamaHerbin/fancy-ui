<script setup lang="ts">
// Mirrors src/lib/components/docs/DemoRenderer.svelte, slug "confetti":
// <ConfettiButton> (no props) wrapping the "Click for Confetti" button.
import { ConfettiButton } from "fancy-ui-vue";
</script>

<template>
	<ConfettiButton>
		<button class="bg-foreground text-background rounded-md px-4 py-2 text-sm font-medium">
			Click for Confetti
		</button>
	</ConfettiButton>
</template>
