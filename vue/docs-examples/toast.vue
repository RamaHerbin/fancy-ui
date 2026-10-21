<script setup lang="ts">
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
	<Button :onclick="show">Show toast</Button>
</template>
