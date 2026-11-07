<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/presence/BasicUsage.svelte.
import { ref } from "vue";
import { Button, Checkbox, Presence } from "fancy-ui-vue";

const agreed = ref(false);
// Remounting (via :key) puts the demo back in its first state, so the enter
// motion plays again from scratch.
const replayKey = ref(0);

function replay() {
	agreed.value = false;
	replayKey.value++;
}
</script>

<template>
	<div class="flex w-full flex-col gap-4 p-6">
		<div class="flex justify-end">
			<Button variant="outline" size="sm" @click="replay">Replay</Button>
		</div>

		<div :key="replayKey" class="flex flex-col gap-2">
			<Checkbox v-model:checked="agreed">I agree to the terms and conditions</Checkbox>

			<Presence :open="!agreed" :duration="200" :exit-duration="150">
				<p class="text-destructive text-sm">You must agree before continuing.</p>
			</Presence>
		</div>
	</div>
</template>
