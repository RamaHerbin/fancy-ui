<script setup lang="ts">
// Mirrors src/lib/components/docs/DemoRenderer.svelte, slug "skeleton":
// <Skeleton variant="text" lines={3} class="w-72 text-base" /> (defaultProps).
import { Skeleton } from "fancy-ui-vue";
</script>

<template>
	<Skeleton variant="text" :lines="3" class="w-72 text-base" />
</template>
