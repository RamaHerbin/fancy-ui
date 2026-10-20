<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/toast/BasicUsage.svelte.
import { Button, Toaster, toast } from "fancy-ui-vue";

function show() {
	toast({
		title: "Theme saved",
		description: "CSS copied to the clipboard.",
		variant: "success",
	});
}
</script>

<template>
	<Toaster sound />
	<Button @click="show">Show toast</Button>
</template>
