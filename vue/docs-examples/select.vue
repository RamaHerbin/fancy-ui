<script setup lang="ts">
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
		v-model:value="framework"
		sound
		:options="frameworks"
		label="Framework"
		placeholder="Choose a framework"
		class="w-[220px]"
	/>
</template>
