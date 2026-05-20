<script lang="ts">
	import {
		categories,
		categoryLabels,
		getComponentsGroupedByCategory,
		getAllComponents,
		getStats,
	} from "$lib/fancy-ui/registry.js";
	import ComponentCard from "$lib/components/docs/ComponentCard.svelte";

	const grouped = getComponentsGroupedByCategory();
	const allComponents = getAllComponents();
	const stats = getStats();

	let activeCategory = $state<string>("all");
	let searchQuery = $state("");

	let filteredComponents = $derived.by(() => {
		let items = activeCategory === "all" ? allComponents : grouped[activeCategory as keyof typeof grouped] || [];
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			items = items.filter(
				(c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
			);
		}
		return items;
	});
</script>

<svelte:head>
	<title>Components - FancyUI Docs</title>
</svelte:head>

<div class="max-w-5xl">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="text-foreground mb-2 text-3xl font-bold" id="components">Components</h1>
		<p class="text-muted-foreground">
			{stats.done} beautifully animated components for Svelte 5. Browse, search, and find what you need.
		</p>
	</div>

	<!-- Stats -->
	<div class="bg-muted/40 mb-8 flex items-center gap-6 rounded-lg border p-4">
		<div class="text-center">
			<div class="text-foreground text-2xl font-bold">{stats.done}</div>
			<div class="text-muted-foreground text-xs">Components</div>
		</div>
		<div class="bg-border h-8 w-px"></div>
		<div class="text-center">
			<div class="text-foreground text-2xl font-bold">{categories.length}</div>
			<div class="text-muted-foreground text-xs">Categories</div>
		</div>
		<div class="bg-border h-8 w-px"></div>
		<div class="text-center">
			<div class="text-2xl font-bold text-emerald-500">100%</div>
			<div class="text-muted-foreground text-xs">TypeScript</div>
		</div>
	</div>

	<!-- Filters -->
	<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
		<!-- Search -->
		<div class="relative flex-1">
			<svg class="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
			</svg>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Filter components..."
				class="border-border bg-background text-foreground placeholder:text-muted-foreground h-9 w-full rounded-md border pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2"
			/>
		</div>

		<!-- Category tabs -->
		<div class="flex flex-wrap gap-1">
			<button
				onclick={() => (activeCategory = "all")}
				class="rounded-full px-3 py-1 text-xs font-medium transition-colors {activeCategory === 'all'
					? 'bg-foreground text-background'
					: 'bg-muted text-muted-foreground hover:text-foreground'}"
			>
				All
			</button>
			{#each categories as cat}
				{@const count = grouped[cat]?.length || 0}
				{#if count > 0}
					<button
						onclick={() => (activeCategory = cat)}
						class="rounded-full px-3 py-1 text-xs font-medium transition-colors {activeCategory === cat
							? 'bg-foreground text-background'
							: 'bg-muted text-muted-foreground hover:text-foreground'}"
					>
						{categoryLabels[cat]}
						<span class="ml-1 opacity-60">{count}</span>
					</button>
				{/if}
			{/each}
		</div>
	</div>

	<!-- Grid -->
	{#if filteredComponents.length > 0}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each filteredComponents as component (component.slug)}
				<ComponentCard {component} />
			{/each}
		</div>
	{:else}
		<div class="text-muted-foreground py-20 text-center">
			<p>No components match your search.</p>
		</div>
	{/if}
</div>
