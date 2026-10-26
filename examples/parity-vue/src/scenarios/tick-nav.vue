<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/tick-nav/BasicUsage.svelte.
import { ref } from "vue";
import { TickNav, type TickNavItem } from "fancy-ui-vue";

const items: TickNavItem[] = [
	{ id: "signal", label: "01 Signal" },
	{ id: "noise", label: "02 Noise" },
	{ id: "pulse", label: "03 Pulse" },
	{ id: "drift", label: "04 Drift", badge: "New" },
	{ id: "echo", label: "05 Echo" },
	{ id: "static", label: "06 Static" },
	{ id: "carrier", label: "07 Carrier" },
];

const value = ref("pulse");
</script>

<template>
	<div
		class="flex w-full justify-center rounded-xl bg-[#07060b] py-10 text-[15px] tracking-tight text-white"
		style="--ft-accent: oklch(0.72 0.19 300)"
	>
		<TickNav :items="items" v-model:value="value" variant="neon" aria-label="Channels" sound />
	</div>
</template>
