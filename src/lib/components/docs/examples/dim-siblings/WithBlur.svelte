<script lang="ts">
	import { DimSiblings } from "$lib/fancy-ui/dim-siblings";

	const PLANS = [
		{ name: "Starter", price: "$9", blurb: "For solo projects." },
		{ name: "Team", price: "$29", blurb: "For small teams." },
		{ name: "Scale", price: "$99", blurb: "For growing products." },
	];
</script>

<div class="w-full p-6">
	<DimSiblings effect="both" class="grid grid-cols-1 gap-4 sm:grid-cols-3">
		{#each PLANS as plan}
			<div class="border-border bg-card rounded-xl border p-4">
				<p class="text-foreground text-sm font-semibold">{plan.name}</p>
				<p class="text-foreground mt-1 text-2xl font-bold">{plan.price}</p>
				<p class="text-muted-foreground mt-2 text-sm">{plan.blurb}</p>
			</div>
		{/each}
	</DimSiblings>
	<p class="text-muted-foreground mt-4 text-xs">
		Hover or focus one plan — the others dim <em>and</em> blur, via
		<code class="text-xs">effect="both"</code>.
	</p>
</div>
