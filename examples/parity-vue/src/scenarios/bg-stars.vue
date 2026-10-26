<script setup lang="ts">
// Mirrors the direct render of $lib/fancy-ui/bg-stars (StarsBackground, no props) in DemoRenderer.svelte,
// inside the `previewBox` stage.
import { StarsBackground } from "fancy-ui-vue";
</script>

<template>
	<div data-demo-stage class="relative flex h-[300px] w-full items-center justify-center">
		<StarsBackground />
	</div>
</template>
