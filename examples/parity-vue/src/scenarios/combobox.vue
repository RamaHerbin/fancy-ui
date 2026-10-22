<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/combobox/BasicUsage.svelte.
import { ref } from "vue";
import { Combobox } from "fancy-ui-vue";

const frameworks = [
	{ value: "svelte-5", label: "Svelte 5" },
	{ value: "sveltekit", label: "SvelteKit" },
	{ value: "react", label: "React" },
	{ value: "vue", label: "Vue" },
];

const framework = ref("");
</script>

<template>
	<Combobox
		sound
		:options="frameworks"
		v-model:value="framework"
		label="Framework"
		placeholder="Search…"
	/>
</template>
