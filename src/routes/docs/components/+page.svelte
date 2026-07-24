<script lang="ts">
	import {
		categories,
		getComponentsGroupedByCategory,
		getAllComponents,
		getStats,
	} from "$lib/fancy-ui/registry.js";
	import ComponentCard from "$lib/components/docs/ComponentCard.svelte";
	import { t } from "$lib/stores";
	import type { MessageKey } from "$lib/i18n/messages/en.js";

	const grouped = getComponentsGroupedByCategory();
	const allComponents = getAllComponents();
	const stats = getStats();

	const coreCount = allComponents.filter((c) => c.group === "core").length;
	const fancyCount = allComponents.filter((c) => c.group === "fancy").length;

	// Only count categories that actually contain components (empty Core
	// categories exist in the union until their phase lands).
	const populatedCategories = categories.filter((c) => (grouped[c] ?? []).length > 0);

	let activeCategory = $state<string>("all");
	let activeGroup = $state<"all" | "core" | "fancy">("all");
	let searchQuery = $state("");

	let filteredComponents = $derived.by(() => {
		let items =
			activeCategory === "all"
				? allComponents
				: grouped[activeCategory as keyof typeof grouped] || [];
		if (activeGroup !== "all") {
			items = items.filter((c) => c.group === activeGroup);
		}
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
		<h1 class="text-foreground mb-2 text-3xl font-bold" id="components">{t("gallery.title")}</h1>
		<p class="text-muted-foreground">
			{t("gallery.subtitle").replace("{count}", String(stats.done))}
		</p>
	</div>

	<!-- Stats -->
	<div class="bg-muted/40 mb-8 flex items-center gap-6 rounded-lg border p-4">
		<div class="text-center">
			<div class="text-foreground text-2xl font-bold">{stats.done}</div>
			<div class="text-muted-foreground text-xs">{t("gallery.statComponents")}</div>
		</div>
		<div class="bg-border h-8 w-px"></div>
		<div class="text-center">
			<div class="text-foreground text-2xl font-bold">{populatedCategories.length}</div>
			<div class="text-muted-foreground text-xs">{t("gallery.statCategories")}</div>
		</div>
		<div class="bg-border h-8 w-px"></div>
		<div class="text-center">
			<div class="text-2xl font-bold text-emerald-500">100%</div>
			<div class="text-muted-foreground text-xs">{t("gallery.statTypescript")}</div>
		</div>
	</div>

	<!-- Group filters -->
	<div class="mb-4 flex flex-wrap gap-1">
		<button
			onclick={() => (activeGroup = "all")}
			class="rounded-full px-3 py-1 text-xs font-medium transition-colors {activeGroup === 'all'
				? 'bg-foreground text-background'
				: 'bg-muted text-muted-foreground hover:text-foreground'}"
		>
			{t("gallery.all")}
			<span class="ml-1 opacity-60">{allComponents.length}</span>
		</button>
		<button
			onclick={() => (activeGroup = "core")}
			class="rounded-full px-3 py-1 text-xs font-medium transition-colors {activeGroup === 'core'
				? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
				: 'bg-muted text-muted-foreground hover:text-foreground'}"
		>
			{t("group.core")}
			<span class="ml-1 opacity-60">{coreCount}</span>
		</button>
		<button
			onclick={() => (activeGroup = "fancy")}
			class="rounded-full px-3 py-1 text-xs font-medium transition-colors {activeGroup === 'fancy'
				? 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
				: 'bg-muted text-muted-foreground hover:text-foreground'}"
		>
			{t("group.fancy")}
			<span class="ml-1 opacity-60">{fancyCount}</span>
		</button>
	</div>

	<!-- Filters -->
	<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
		<!-- Search -->
		<div class="relative flex-1">
			<svg
				class="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
				xmlns="http://www.w3.org/2000/svg"
				width="14"
				height="14"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
			</svg>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder={t("gallery.filterPlaceholder")}
				class="border-border bg-background text-foreground placeholder:text-muted-foreground h-9 w-full rounded-md border pr-4 pl-9 text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none"
			/>
		</div>

		<!-- Category tabs -->
		<div class="flex flex-wrap gap-1">
			<button
				onclick={() => (activeCategory = "all")}
				class="rounded-full px-3 py-1 text-xs font-medium transition-colors {activeCategory ===
				'all'
					? 'bg-foreground text-background'
					: 'bg-muted text-muted-foreground hover:text-foreground'}"
			>
				{t("gallery.all")}
			</button>
			{#each categories as cat}
				{@const count = grouped[cat]?.length || 0}
				{#if count > 0}
					<button
						onclick={() => (activeCategory = cat)}
						class="rounded-full px-3 py-1 text-xs font-medium transition-colors {activeCategory ===
						cat
							? 'bg-foreground text-background'
							: 'bg-muted text-muted-foreground hover:text-foreground'}"
					>
						{t(`category.${cat}` as MessageKey)}
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
				<div class="relative">
					<span
						class="pointer-events-none absolute top-2 right-2 z-10 rounded-full px-2 py-0.5 text-[10px] font-medium {component.group ===
						'core'
							? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
							: 'bg-purple-500/15 text-purple-600 dark:text-purple-400'}"
					>
						{t(`group.${component.group}` as MessageKey)}
					</span>
					<ComponentCard {component} />
				</div>
			{/each}
		</div>
	{:else}
		<div class="text-muted-foreground py-20 text-center">
			<p>{t("gallery.noMatch")}</p>
		</div>
	{/if}
</div>
