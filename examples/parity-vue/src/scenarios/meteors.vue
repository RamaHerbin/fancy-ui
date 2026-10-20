<script setup lang="ts">
// Mirrors src/lib/components/docs/DemoRenderer.svelte, slug "meteors":
// <Meteors count={15} /> (defaultProps.meteors).
import { Meteors } from "fancy-ui-vue";
</script>

<template>
	<Meteors :count="15" />
</template>
