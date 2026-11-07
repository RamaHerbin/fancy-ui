<script setup lang="ts">
// Mirrors the direct render of $lib/fancy-ui/box-reveal (BoxReveal) in DemoRenderer.svelte.
import { ref } from "vue";
import { BoxReveal, Button } from "fancy-ui-vue";

// BoxReveal plays once on mount; remounting it (via :key) replays it.
const replayKey = ref(0);
</script>

<template>
	<div class="flex flex-col items-center gap-6">
		<BoxReveal :key="replayKey" color="var(--primary)" :duration="0.5">
			<h2 class="text-foreground text-2xl font-bold">Box Reveal</h2>
		</BoxReveal>
		<Button variant="outline" size="sm" @click="replayKey++">Replay</Button>
	</div>
</template>
