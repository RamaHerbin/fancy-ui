<script lang="ts">
	import { ApprovalCard } from "$lib/fancy-ui/approval-card";
	import type { ApprovalState } from "$lib/fancy-ui/approval-card";
	import { RecommendationCard } from "$lib/fancy-ui/recommendation-card";
	import type { RecommendationState } from "$lib/fancy-ui/recommendation-card";
	import { SoundToggle } from "$lib/fancy-ui/sound/index.js";

	let gate = $state<ApprovalState>("pending");
	let suggestion = $state<RecommendationState>("open");

	const settled = $derived(gate !== "pending" || suggestion !== "open");

	function reset() {
		gate = "pending";
		suggestion = "open";
	}
</script>

<div class="flex w-full max-w-xl flex-col gap-4">
	<div class="flex flex-wrap items-center gap-3">
		<SoundToggle size="sm" showLabel label="Sound for the agent cards" />
		<span class="text-muted-foreground text-sm">
			Turn sound on, then decide the gate or answer the suggestion.
		</span>
	</div>

	<!-- Approve and deny share one select cue — a refusal is a decision, not an
	     error. On the recommendation, accept plays select and dismiss plays close. -->
	<ApprovalCard
		sound
		title="Restart the staging cluster"
		description="Drains both nodes, then brings them back one at a time. About two minutes of downtime."
		bind:state={gate}
	/>

	<RecommendationCard
		sound
		badge="Suggestion"
		title="Batch the nightly export"
		description="Four exports run within the same ten minutes and each opens its own connection pool."
		confidence={0.81}
		acceptLabel="Batch them"
		bind:state={suggestion}
	/>

	{#if settled}
		<p class="text-muted-foreground text-sm">
			<button
				type="button"
				class="text-foreground underline decoration-dotted underline-offset-2"
				onclick={reset}
			>
				Reset both
			</button>
		</p>
	{/if}
</div>
