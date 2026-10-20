<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/radio-group/BasicUsage.svelte.
import { ref } from "vue";
import { RadioGroup, RadioGroupItem } from "fancy-ui-vue";

const plan = ref("a");
</script>

<template>
	<RadioGroup sound v-model:value="plan" label="Plan">
		<RadioGroupItem value="a" label="Option A" />
		<RadioGroupItem value="b" label="Option B" />
		<RadioGroupItem value="c" label="Option C" />
	</RadioGroup>
</template>
