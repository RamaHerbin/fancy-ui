<script setup lang="ts">
// Parity variant for scripts/parity/states.mjs; mirrors
// src/routes/_parity/[slug]/variants/toast--long.svelte.
import { Button, Toaster, toast } from "fancy-ui-vue";

function show() {
	toast({
		title: "The export of every board in the workspace is ready to download",
		description:
			"The archive holds 48 boards, 1,204 cards and every attachment. The download link stays valid for seven days, and anyone with the link can open it, so share it with care. A new export can be requested from the settings page at any time.",
		variant: "info",
		duration: Infinity,
		action: { label: "Download", onClick: () => {} },
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
