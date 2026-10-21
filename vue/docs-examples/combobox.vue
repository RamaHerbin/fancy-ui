<script setup lang="ts">
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
		v-model:value="framework"
		sound
		:options="frameworks"
		label="Framework"
		placeholder="Search…"
	/>
</template>
