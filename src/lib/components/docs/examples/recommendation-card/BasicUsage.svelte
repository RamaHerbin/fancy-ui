<script lang="ts">
	import { RecommendationCard } from "$lib/fancy-ui/recommendation-card";
	import type { RecommendationState } from "$lib/fancy-ui/recommendation-card";

	// Nothing is on a timer here: the demo only moves when you move it, so there
	// is no rig to hold still for reduced motion.
	let indexState = $state<RecommendationState>("open");
	let cacheState = $state<RecommendationState>("open");

	const settled = $derived(indexState !== "open" || cacheState !== "open");

	function reset() {
		indexState = "open";
		cacheState = "open";
	}
</script>

<div class="flex w-full max-w-xl flex-col gap-3 p-6">
	<RecommendationCard
		sound
		badge="Suggestion"
		title="Add an index on orders.customer_id"
		description="The three slowest queries this week all scanned the whole table."
		confidence={0.87}
		acceptLabel="Apply migration"
		bind:state={indexState}
	>
		<code
			class="bg-foreground/5 text-muted-foreground block rounded-md px-2.5 py-1.5 font-mono text-xs"
		>
			CREATE INDEX orders_customer_id_idx ON orders (customer_id);
		</code>
	</RecommendationCard>

	<RecommendationCard
		sound
		badge="Speculative"
		title="Cache the pricing lookup for 60 seconds"
		description="Prices changed twice last quarter, so staleness is cheap — but the traffic here is modest."
		confidence={0.42}
		acceptLabel="Apply patch"
		dismissLabel="Not now"
		bind:state={cacheState}
	/>

	<div class="mt-1 flex items-center justify-between gap-3">
		<p class="text-muted-foreground text-xs">
			The ring and the counter agree on one figure; the band shifts colour at 75% and 50%.
		</p>
		{#if settled}
			<button
				type="button"
				class="text-muted-foreground hover:text-foreground hover:bg-foreground/5 flex-none rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
				onclick={reset}
			>
				Reset both
			</button>
		{/if}
	</div>
</div>
