<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/select/BasicUsage.svelte.
import { ref } from "vue";
import { Select } from "fancy-ui-vue";

const frameworks = [
	{ value: "svelte", label: "Svelte 5" },
	{ value: "react", label: "React" },
	{ value: "vue", label: "Vue" },
];

const framework = ref("svelte");
</script>

<template>
	<Select
		sound
		:options="frameworks"
		v-model:value="framework"
		label="Framework"
		placeholder="Choose a framework"
		class="w-[220px]"
	/>
</template>
