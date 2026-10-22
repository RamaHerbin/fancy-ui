<script setup lang="ts">
// Mirrors the neon-border branch of src/lib/components/docs/DemoRenderer.svelte (defaultProps {} + child).
import { NeonBorder } from "fancy-ui-vue";
</script>

<template>
	<NeonBorder>
		<div class="rounded-xl p-8 text-center">
			<p class="text-foreground font-semibold">Neon Border</p>
		</div>
	</NeonBorder>
</template>
