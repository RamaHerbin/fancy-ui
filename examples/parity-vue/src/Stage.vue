<script setup lang="ts">
// The contract box, identical to src/routes/_parity/[slug]/+page.svelte.
import type { Component } from "vue";

defineProps<{ scenario: Component | null; slug: string }>();
</script>

<template>
	<div class="bg-background grid min-h-screen place-items-center">
		<div
			data-parity-stage
			class="bg-background relative flex items-center justify-center overflow-hidden"
			style="width: 800px; height: 500px"
		>
			<component :is="scenario" v-if="scenario" />
			<div v-else data-parity-missing class="text-muted-foreground text-sm">
				No Vue scenario for "{{ slug }}"
			</div>
		</div>
	</div>
</template>
