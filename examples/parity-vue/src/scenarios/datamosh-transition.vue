<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/datamosh-transition/BasicUsage.svelte.
import { ref } from "vue";
import { DatamoshTransition } from "fancy-ui-vue";

const pages = [
	{ title: "Page one", body: "Press the button to go to the next page." },
	{ title: "Page two", body: "The page changed while the screen was covered." },
];

const transition = ref<InstanceType<typeof DatamoshTransition> | null>(null);
const current = ref(0);
const busy = ref(false);

async function navigate() {
	if (busy.value || !transition.value) return;
	busy.value = true;
	await transition.value.cover();
	current.value = (current.value + 1) % pages.length;
	await transition.value.reveal();
	busy.value = false;
}
</script>

<template>
	<div
		class="relative flex h-80 w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-[#14101f] text-center text-white"
	>
		<h3 class="text-3xl font-semibold tracking-tight">{{ pages[current].title }}</h3>
		<p class="text-sm text-white/60">{{ pages[current].body }}</p>
		<button
			class="rounded-full bg-white px-4 py-2 text-sm font-medium text-[#14101f] disabled:opacity-60"
			:disabled="busy"
			@click="navigate"
		>
			Next page
		</button>
		<DatamoshTransition ref="transition" contained />
	</div>
</template>
