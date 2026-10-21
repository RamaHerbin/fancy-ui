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
