<script setup lang="ts">
// Mirrors the direct render of $lib/fancy-ui/blur-reveal (BlurReveal) in DemoRenderer.svelte.
import { BlurReveal } from "fancy-ui-vue";
</script>

<template>
	<BlurReveal>
		<h2 class="text-foreground text-2xl font-bold">Blur Reveal Effect</h2>
		<p class="text-muted-foreground">Content fades in from blur as you scroll.</p>
	</BlurReveal>
</template>
