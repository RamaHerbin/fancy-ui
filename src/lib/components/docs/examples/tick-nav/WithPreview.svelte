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

<div class="flex w-full justify-center py-8 pr-40 text-[15px] tracking-tight">
	<TickNav {items} bind:value ariaLabel="Palettes" sound>
		{#snippet preview(item)}
			<div class="flex h-full w-full items-end p-3" style:background={swatches[item.id]}>
				<span class="text-xs font-medium text-white/90">{item.label}</span>
			</div>
		{/snippet}
	</TickNav>
</div>
