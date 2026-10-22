<script setup lang="ts">
// Mirrors the direct render of $lib/fancy-ui/box-reveal (BoxReveal) in DemoRenderer.svelte.
import { BoxReveal } from "fancy-ui-vue";
</script>

<template>
	<BoxReveal color="var(--primary)" :duration="0.5">
		<h2 class="text-foreground text-2xl font-bold">Box Reveal</h2>
	</BoxReveal>
</template>
