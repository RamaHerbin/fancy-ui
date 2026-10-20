<script setup lang="ts">
// Mirrors src/lib/components/docs/DemoRenderer.svelte, slug "sparkles":
// <Sparkles background="transparent" particleColor="#ffffff" particleDensity={60} />.
import { Sparkles } from "fancy-ui-vue";
</script>

<template>
	<Sparkles background="transparent" particle-color="#ffffff" :particle-density="60" />
</template>
