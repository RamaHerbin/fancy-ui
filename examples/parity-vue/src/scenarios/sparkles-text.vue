<script setup lang="ts">
// Mirrors src/lib/components/docs/DemoRenderer.svelte, slug "sparkles-text":
// <SparklesText text="Sparkles" sparklesCount={8} />.
import { SparklesText } from "fancy-ui-vue";
</script>

<template>
	<SparklesText text="Sparkles" :sparkles-count="8" />
</template>
