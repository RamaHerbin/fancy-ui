<script lang="ts">
	import { TickNav, type TickNavItem } from "$lib/fancy-ui/tick-nav";

	const items: TickNavItem[] = [
		{ id: "aurora", label: "Aurora" },
		{ id: "dune", label: "Dune" },
		{ id: "lagoon", label: "Lagoon" },
		{ id: "ember", label: "Ember", badge: "New" },
		{ id: "glacier", label: "Glacier" },
		{ id: "moss", label: "Moss" },
		{ id: "dusk", label: "Dusk" },
	];

	const swatches: Record<string, string> = {
		aurora: "linear-gradient(135deg, #22d3ee, #a78bfa)",
		dune: "linear-gradient(135deg, #f59e0b, #b45309)",
		lagoon: "linear-gradient(135deg, #14b8a6, #0ea5e9)",
		ember: "linear-gradient(135deg, #f97316, #e11d48)",
		glacier: "linear-gradient(135deg, #e0f2fe, #93c5fd)",
		moss: "linear-gradient(135deg, #84cc16, #166534)",
		dusk: "linear-gradient(135deg, #6366f1, #be185d)",
	};

	let value = $state("aurora");
</script>

<div class="flex w-full py-6 pr-56 text-sm sm:justify-center">
	<TickNav {items} bind:value ariaLabel="Palettes" sound>
		{#snippet preview(item)}
			<div class="bg-background w-44 rounded-lg border p-2 shadow-lg">
				<div class="h-24 rounded-md" style:background={swatches[item.id]}></div>
				<p class="text-muted-foreground mt-2 text-xs">{item.label} palette</p>
			</div>
		{/snippet}
	</TickNav>
</div>
