<script setup lang="ts">
// Mirrors the number-ticker entry of defaultProps in src/lib/components/docs/DemoRenderer.svelte.
import { NumberTicker } from "fancy-ui-vue";
</script>

<template>
	<NumberTicker :value="1234" />
</template>
