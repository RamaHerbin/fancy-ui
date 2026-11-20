<script setup lang="ts">
// Mirrors src/lib/components/docs/DemoRenderer.svelte, slug "glow-border":
// <GlowBorder /> with empty defaultProps and no children.
import { GlowBorder } from "fancy-ui-vue";
</script>

<template>
	<div class="bg-background relative flex h-40 w-64 items-center justify-center rounded-xl p-6">
		<p data-glow-border-demo class="text-muted-foreground text-center">Glow Border</p>
		<GlowBorder />
	</div>
</template>
