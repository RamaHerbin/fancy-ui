<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/autocomplete/BasicUsage.svelte.
import { ref } from "vue";
import { Autocomplete } from "fancy-ui-vue";

const cities = ["Paris", "Parma", "Prague", "London", "Lisbon", "Lyon"];
const city = ref("");
</script>

<template>
	<Autocomplete
		v-model:value="city"
		sound
		:suggestions="cities"
		label="City"
		placeholder="Type a city…"
	/>
</template>
