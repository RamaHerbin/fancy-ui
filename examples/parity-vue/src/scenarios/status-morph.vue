<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/status-morph/BasicUsage.svelte.
import { ref } from "vue";
import { Button, StatusMorph, Switch } from "fancy-ui-vue";

type Status = "idle" | "loading" | "success" | "error";

const status = ref<Status>("idle");
const failNext = ref(false);

async function save() {
	status.value = "loading";
	await new Promise((resolve) => setTimeout(resolve, 1200));
	status.value = failNext.value ? "error" : "success";
}
</script>

<template>
	<div class="flex w-full flex-col items-center gap-6 p-6">
		<Button :loading="status === 'loading'" @click="save">
			<template #iconStart>
				<StatusMorph v-model:state="status" />
			</template>
			Save changes
		</Button>

		<Switch v-model:checked="failNext">Fail next save</Switch>
	</div>
</template>
