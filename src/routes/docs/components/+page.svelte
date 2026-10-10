<script lang="ts">
	import { onMount } from "svelte";
	import { replaceState } from "$app/navigation";
	import { page } from "$app/state";
	import {
		categories,
		getComponentsGroupedByCategory,
		getAllComponents,
		getStats,
		matchesQuery,
	} from "$lib/fancy-ui/registry.js";
	import ComponentCard from "$lib/components/docs/ComponentCard.svelte";
	import Seo from "$lib/components/Seo.svelte";
	import JsonLd from "$lib/components/JsonLd.svelte";
	import { SITE_DESCRIPTION, SITE_URL } from "$lib/site.js";
	import { t, tCategory, docTitle } from "$lib/stores";
	import type { MessageKey } from "$lib/i18n/messages/en.js";
	import type { ComponentCategory } from "$lib/types.js";

	type Group = "all" | "core" | "fancy";

	const grouped = getComponentsGroupedByCategory();
	const allComponents = getAllComponents();
	const stats = getStats();

	// Only categories that actually contain components (empty Core categories
	// exist in the union until their phase lands).
	const populatedCategories = categories.filter((c) => (grouped[c] ?? []).length > 0);

	const groupCounts: Record<Group, number> = {
		all: allComponents.length,
		core: allComponents.filter((c) => c.group === "core").length,
		fancy: allComponents.filter((c) => c.group === "fancy").length,
	};
	const groups: Group[] = ["all", "core", "fancy"];

	/** The full gallery, not the filtered view — filters are a client-side lens. */
	const itemList = {
		"@context": "https://schema.org",
		"@type": "ItemList",
		"@id": `${SITE_URL}/docs/components#list`,
		numberOfItems: allComponents.length,
		itemListElement: allComponents.map((component, index) => ({
			"@type": "ListItem",
			position: index + 1,
			name: component.name,
			url: `${SITE_URL}/docs/components/${component.slug}`,
		})),
	};

	let searchQuery = $state("");
	let activeGroup = $state<Group>("all");
	let activeSection = $state<string>(populatedCategories[0] ?? "");
	let searchInput = $state<HTMLInputElement | null>(null);
	let chipRow = $state<HTMLElement | null>(null);
	let ready = $state(false);

	const isFiltered = $derived(searchQuery.trim() !== "" || activeGroup !== "all");

	/** Every category keeps its section; filtering only empties some of them out. */
	const sections = $derived(
		populatedCategories.map((category) => ({
			category,
			items: grouped[category].filter(
				(c) => (activeGroup === "all" || c.group === activeGroup) && matchesQuery(c, searchQuery)
			),
		}))
	);
	const resultCount = $derived(sections.reduce((n, s) => n + s.items.length, 0));

	function clearFilters() {
		searchQuery = "";
		activeGroup = "all";
		searchInput?.focus();
	}

	function jumpTo(event: MouseEvent, category: ComponentCategory) {
		const target = document.getElementById(category);
		if (!target) return;
		event.preventDefault();
		target.scrollIntoView({
			behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
			block: "start",
		});
		history.replaceState(history.state, "", `#${category}`);
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
		const el = event.target as HTMLElement | null;
		if (el?.closest("input, textarea, select, [contenteditable='true']")) return;
		event.preventDefault();
		searchInput?.focus();
	}

	// Restore the lens from the URL once in the browser: the page is prerendered,
	// so search params are not readable during the build.
	onMount(() => {
		const params = page.url.searchParams;
		searchQuery = params.get("q") ?? "";
		const g = params.get("group");
		if (g === "core" || g === "fancy") activeGroup = g;
		ready = true;
	});

	// Mirror the lens back into the URL, so a filtered view survives reload and back.
	$effect(() => {
		if (!ready) return;
		const url = new URL(page.url);
		const q = searchQuery.trim();
		if (q) url.searchParams.set("q", q);
		else url.searchParams.delete("q");
		if (activeGroup !== "all") url.searchParams.set("group", activeGroup);
		else url.searchParams.delete("group");
		if (url.search !== page.url.search) replaceState(url, page.state);
	});

	// Scroll-spy for the category chips: the section crossing the upper third of
	// the viewport is the current one.
	$effect(() => {
		void sections;
		const els = document.querySelectorAll<HTMLElement>("[data-gallery-section]:not([hidden])");
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) activeSection = entry.target.id;
				}
			},
			{ rootMargin: "-30% 0px -65% 0px" }
		);
		els.forEach((el) => observer.observe(el));
		return () => observer.disconnect();
	});

	// Keep the active chip visible inside its horizontally scrolling row.
	$effect(() => {
		const chip = chipRow?.querySelector<HTMLElement>(`[data-chip="${activeSection}"]`);
		if (!chip || !chipRow) return;
		const row = chipRow;
		const left = chip.offsetLeft - row.clientWidth / 2 + chip.offsetWidth / 2;
		row.scrollTo({ left, behavior: "smooth" });
	});
</script>

<svelte:window onkeydown={onKeydown} />

<Seo title={docTitle(t("gallery.title"))} description={SITE_DESCRIPTION} path="/docs/components" />
<JsonLd data={itemList} />

<div class="max-w-5xl">
	<!-- Header -->
	<div class="mb-6">
		<h1 class="text-foreground mb-2 text-3xl font-bold tracking-tight" id="components">
			{t("gallery.title")}
		</h1>
		<p class="text-muted-foreground text-base">
			{t("gallery.subtitle").replace("{count}", String(stats.done))}
		</p>
		<p class="text-muted-foreground mt-3 max-w-2xl text-sm leading-relaxed">
			{t("gallery.intro")}
		</p>
		<p class="text-muted-foreground/80 mt-4 font-mono text-xs">
			{t("gallery.meta")
				.replace("{components}", String(stats.done))
				.replace("{categories}", String(populatedCategories.length))}
		</p>
	</div>

	<!-- Toolbar: sticks under the doc header so the lens stays in reach while browsing. -->
	<div
		class="gallery-toolbar bg-background/90 supports-[backdrop-filter]:bg-background/70 z-20 mb-8 border-b pt-3 pb-2 backdrop-blur sm:sticky sm:top-14"
	>
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
			<!-- Search -->
			<div class="relative flex-1">
				<svg
					class="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
					xmlns="http://www.w3.org/2000/svg"
					width="15"
					height="15"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
				</svg>
				<input
					bind:this={searchInput}
					bind:value={searchQuery}
					type="search"
					placeholder={t("gallery.filterPlaceholder")}
					aria-label={t("gallery.filterPlaceholder")}
					onkeydown={(e) => {
						if (e.key === "Escape" && searchQuery) {
							e.stopPropagation();
							searchQuery = "";
						}
					}}
					class="border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring h-10 w-full rounded-lg border pr-16 pl-9 text-sm focus-visible:ring-2 focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
				/>
				<div class="absolute top-1/2 right-2 flex -translate-y-1/2 items-center">
					{#if searchQuery}
						<button
							type="button"
							onclick={() => {
								searchQuery = "";
								searchInput?.focus();
							}}
							class="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md p-1.5"
							aria-label={t("gallery.clearSearch")}
						>
							<svg
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								aria-hidden="true"
							>
								<path d="M18 6 6 18M6 6l12 12" />
							</svg>
						</button>
					{:else}
						<kbd
							class="border-border text-muted-foreground hidden rounded border px-1.5 py-0.5 font-mono text-[10px] sm:inline-block"
							title={t("gallery.searchHint")}
						>
							/
						</kbd>
					{/if}
				</div>
			</div>

			<!-- Group -->
			<div
				role="radiogroup"
				aria-label={t("gallery.groupLabel")}
				class="bg-muted inline-flex h-10 shrink-0 items-center gap-0.5 self-start rounded-lg p-1 sm:self-auto"
			>
				{#each groups as group (group)}
					<button
						type="button"
						role="radio"
						aria-checked={activeGroup === group}
						onclick={() => (activeGroup = group)}
						class="h-8 rounded-md px-3 text-xs font-medium transition-colors {activeGroup === group
							? 'bg-background text-foreground shadow-sm'
							: 'text-muted-foreground hover:text-foreground'}"
					>
						{group === "all" ? t("gallery.all") : t(`group.${group}` as MessageKey)}
						<span class="ml-1 tabular-nums opacity-50">{groupCounts[group]}</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- Category jump row -->
		<nav aria-label={t("gallery.categoryLabel")} class="mt-2 flex items-center gap-3">
			<div
				bind:this={chipRow}
				class="chip-row -mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto px-1 py-1"
			>
				{#each sections as { category, items } (category)}
					<a
						href="#{category}"
						data-chip={category}
						onclick={(e) => jumpTo(e, category)}
						aria-current={activeSection === category ? "true" : undefined}
						class="shrink-0 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors {items.length ===
						0
							? 'hidden'
							: activeSection === category
								? 'bg-foreground text-background'
								: 'text-muted-foreground hover:text-foreground hover:bg-muted'}"
					>
						{tCategory(category)}
						<span class="ml-0.5 tabular-nums opacity-60">{items.length}</span>
					</a>
				{/each}
			</div>
			{#if isFiltered}
				<div class="flex shrink-0 items-center gap-2 text-xs" aria-live="polite">
					<span class="text-muted-foreground tabular-nums">
						{resultCount === 1
							? t("gallery.resultOne")
							: t("gallery.results").replace("{count}", String(resultCount))}
					</span>
					<button
						type="button"
						onclick={clearFilters}
						class="text-foreground font-medium underline-offset-4 hover:underline"
					>
						{t("gallery.clearFilters")}
					</button>
				</div>
			{/if}
		</nav>
	</div>

	<!-- Sections -->
	{#each sections as { category, items } (category)}
		<section
			id={category}
			data-gallery-section
			hidden={items.length === 0}
			class="mb-14 scroll-mt-40"
		>
			<div class="mb-4 flex items-baseline justify-between gap-4 border-b pb-3">
				<div>
					<h2 class="text-foreground text-lg font-semibold tracking-tight">
						{tCategory(category)}
					</h2>
					<p class="text-muted-foreground mt-0.5 text-sm">
						{t(`gallery.desc.${category}` as MessageKey)}
					</p>
				</div>
				<span class="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
					{items.length}
				</span>
			</div>
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each items as component (component.slug)}
					<ComponentCard {component} />
				{/each}
			</div>
		</section>
	{/each}

	{#if resultCount === 0}
		<div class="flex flex-col items-center gap-4 py-20 text-center">
			<p class="text-muted-foreground">{t("gallery.noMatch")}</p>
			<button
				type="button"
				onclick={clearFilters}
				class="border-border hover:bg-muted rounded-lg border px-4 py-2 text-sm font-medium"
			>
				{t("gallery.clearFilters")}
			</button>
		</div>
	{/if}
</div>

<style>
	/* Fade the chip row's scrolling edges instead of cutting chips off hard. */
	.chip-row {
		scrollbar-width: none;
		mask-image: linear-gradient(
			to right,
			transparent,
			#000 12px,
			#000 calc(100% - 24px),
			transparent
		);
	}
	.chip-row::-webkit-scrollbar {
		display: none;
	}
</style>
