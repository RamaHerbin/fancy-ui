<script setup lang="ts">
// Parity variant for scripts/parity/states.mjs; mirrors
// src/routes/_parity/[slug]/variants/toast--action.svelte.
import { Button, Toaster, toast } from "fancy-ui-vue";

function show() {
	toast({
		title: "Message archived",
		description: "It left your inbox.",
		variant: "success",
		duration: Infinity,
		action: { label: "Undo", onClick: () => {} },
	});
}
</script>

<template>
	<Toaster />
	<Button @click="show">Show toast</Button>
</template>

<style>
/* the toaster is fixed to the page corner; the stage shot frames it, so it is pinned inside the stage box */
.ft-toaster-viewport {
	top: 120px !important;
	left: 120px !important;
	right: auto !important;
	bottom: auto !important;
}
</style>
