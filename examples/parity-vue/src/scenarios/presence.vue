<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/presence/BasicUsage.svelte.
import { ref } from "vue";
import { Checkbox, Presence } from "fancy-ui-vue";

const agreed = ref(false);
</script>

<template>
	<div class="flex w-full flex-col gap-2 p-6">
		<Checkbox v-model:checked="agreed">I agree to the terms and conditions</Checkbox>

		<Presence :open="!agreed" :duration="200" :exit-duration="150">
			<p class="text-destructive text-sm">You must agree before continuing.</p>
		</Presence>
	</div>
</template>
