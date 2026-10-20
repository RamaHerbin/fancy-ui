<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/checkbox/BasicUsage.svelte.
import { ref } from "vue";
import { Checkbox } from "fancy-ui-vue";

const agreed = ref(false);
</script>

<template>
	<Checkbox sound v-model:checked="agreed">I agree to the terms and conditions</Checkbox>
</template>
