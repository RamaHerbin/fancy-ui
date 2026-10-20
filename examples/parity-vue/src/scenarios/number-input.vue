<script setup lang="ts">
// Mirrors the number-input entry of defaultProps in src/lib/components/docs/DemoRenderer.svelte.
import { ref } from "vue";
import { NumberInput } from "fancy-ui-vue";

const value = ref<number | null>(12);
</script>

<template>
	<NumberInput v-model:value="value" label="Quantity" :min="0" :max="99" />
</template>
