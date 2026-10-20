<script setup lang="ts">
// Mirrors src/lib/components/docs/DemoRenderer.svelte, slug "flip-words":
// <FlipWords words={defaultProps["flip-words"].words} />.
import { FlipWords } from "fancy-ui-vue";
</script>

<template>
	<FlipWords :words="['beautiful', 'animated', 'interactive', 'composable']" />
</template>
