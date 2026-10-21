<script setup lang="ts">
import { computed, ref } from "vue";
import { Button, StatusMorph, Toaster, dismissToast, toast } from "fancy-ui-vue";
import type { StatusMorphState } from "fancy-ui-vue";

// Stand-in for your request: resolves after a short delay, or rejects while
// "fail the next save" is ticked.
const failNext = ref(false);
function saveDraft(): Promise<void> {
	return new Promise((resolve, reject) => {
		setTimeout(() => (failNext.value ? reject(new Error("offline")) : resolve()), 1200);
	});
}

const status = ref<StatusMorphState>("idle");
const saving = computed(() => status.value === "loading");

async function publish() {
	if (saving.value) return;
	status.value = "loading";
	try {
		await saveDraft();
		// Success is only ever shown once the request has resolved.
		status.value = "success";
	} catch {
		status.value = "error";
		const id = toast({
			title: "Could not publish",
			description: "Check your connection and try again.",
			variant: "error",
			action: {
				label: "Retry",
				onClick: () => {
					dismissToast(id);
					void publish();
				},
			},
		});
	}
}
</script>

<template>
	<Toaster />
	<div class="flex flex-wrap items-center gap-4">
		<Button @click="publish">
			Publish
			<template #iconEnd>
				<StatusMorph v-model:state="status" />
			</template>
		</Button>
		<label class="text-muted-foreground flex items-center gap-2 text-sm">
			<input v-model="failNext" type="checkbox" />
			Fail the next save
		</label>
	</div>
</template>
