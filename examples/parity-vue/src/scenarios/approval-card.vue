<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/approval-card/BasicUsage.svelte.
import { computed, ref } from "vue";
import { ApprovalCard } from "fancy-ui-vue";
import type { ApprovalState } from "fancy-ui-vue";

const branchState = ref<ApprovalState>("pending");
const migrationState = ref<ApprovalState>("pending");

const settled = computed(
	() => [branchState.value, migrationState.value].filter((state) => state !== "pending").length
);

function reset() {
	branchState.value = "pending";
	migrationState.value = "pending";
}
</script>

<template>
	<div class="flex w-full max-w-xl flex-col gap-3 p-6">
		<ApprovalCard
			v-model:state="branchState"
			sound
			title="Create branch fix/retry-backoff"
			description="Branches from develop and pushes an empty commit so CI has something to run."
		/>

		<ApprovalCard
			v-model:state="migrationState"
			sound
			title="Run database migration"
			description="Adds two columns to invoices and backfills 41,880 rows. There is no down migration."
			destructive
			approve-label="Run migration"
			deny-label="Not now"
		>
			<pre
				class="ft-approval-preview text-foreground/80 overflow-x-auto rounded-md px-2.5 py-2 font-mono text-xs"
			>
pnpm db:migrate --env production --yes</pre
			>
		</ApprovalCard>

		<p class="text-muted-foreground mt-1 text-xs">
			<template v-if="settled === 0">
				Both gates are waiting. Nothing runs until you press something.
			</template>
			<template v-else>
				{{ settled }} of 2 decided.
				<button
					type="button"
					class="text-foreground underline decoration-dotted underline-offset-2"
					@click="reset"
				>
					Reset
				</button>
			</template>
		</p>
	</div>
</template>

<style scoped>
.ft-approval-preview {
	background: color-mix(in oklab, currentColor 7%, transparent);
}
</style>
