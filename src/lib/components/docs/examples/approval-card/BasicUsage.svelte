<script lang="ts">
	import { ApprovalCard } from "$lib/fancy-ui/approval-card";
	import type { ApprovalState } from "$lib/fancy-ui/approval-card";

	// No timer, no loop: the demo only moves when someone actually decides
	// something, which is the whole point of the component.
	let branchState = $state<ApprovalState>("pending");
	let migrationState = $state<ApprovalState>("pending");

	const settled = $derived(
		[branchState, migrationState].filter((state) => state !== "pending").length
	);

	function reset() {
		branchState = "pending";
		migrationState = "pending";
	}
</script>

<div class="flex w-full max-w-xl flex-col gap-3 p-6">
	<ApprovalCard
		title="Create branch fix/retry-backoff"
		description="Branches from develop and pushes an empty commit so CI has something to run."
		bind:state={branchState}
	/>

	<ApprovalCard
		title="Run database migration"
		description="Adds two columns to invoices and backfills 41,880 rows. There is no down migration."
		destructive
		approveLabel="Run migration"
		denyLabel="Not now"
		bind:state={migrationState}
	>
		<pre
			class="ft-approval-preview text-foreground/80 overflow-x-auto rounded-md px-2.5 py-2 font-mono text-xs">pnpm db:migrate --env production --yes</pre>
	</ApprovalCard>

	<p class="text-muted-foreground mt-1 text-xs">
		{#if settled === 0}
			Both gates are waiting. Nothing runs until you press something.
		{:else}
			{settled} of 2 decided.
			<button
				type="button"
				class="text-foreground underline decoration-dotted underline-offset-2"
				onclick={reset}
			>
				Reset
			</button>
		{/if}
	</p>
</div>

<style>
	.ft-approval-preview {
		background: color-mix(in oklab, currentColor 7%, transparent);
	}
</style>
