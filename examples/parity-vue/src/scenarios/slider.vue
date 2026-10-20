<script setup lang="ts">
// Mirrors src/lib/components/docs/DemoRenderer.svelte, slug "slider":
// <Slider label="Volume" value={60} showValue showBounds /> (defaultProps).
import { ref } from "vue";
import { Slider } from "fancy-ui-vue";

const value = ref(60);
</script>

<template>
	<Slider v-model:value="value" label="Volume" show-value show-bounds />
</template>
