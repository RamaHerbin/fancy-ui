<!--
	/inspiration — the gallery. Prerendered unfiltered; the filters live in the
	URL and apply after mount (`ready`), so a deep link like ?style=glow works
	on a static host and the server never reads search params.

	Navigation: facet and sort changes push a history entry; typing pushes one
	for the first committed query and replaces it while the visitor keeps
	typing. The search field is re-synced from the URL only when the URL
	changed under it (Back/Forward, first load), never while typing.
-->
<script lang="ts">
	import "$lib/components/site/site.css";
	import { onMount } from "svelte";
	import { page } from "$app/state";
	import { beforeNavigate, goto } from "$app/navigation";
	import SiteFonts from "$lib/components/site/SiteFonts.svelte";
	import CommandSearch from "$lib/components/docs/CommandSearch.svelte";
	import Seo from "$lib/components/Seo.svelte";
	import { SiteFooter, SiteHeader } from "$lib/components/site/index.js";
	import { Button } from "$lib/fancy-ui/button/index.js";
	import ActiveFilters from "$lib/components/inspiration/ActiveFilters.svelte";
	import CardGrid from "$lib/components/inspiration/CardGrid.svelte";
	import EmptyState from "$lib/components/inspiration/EmptyState.svelte";
	import GalleryToolbar from "$lib/components/inspiration/GalleryToolbar.svelte";
	import {
		FACET_LABELS,
		FACET_TITLES,
		TOOLBAR_FACETS,
		cardFrameworks,
	} from "$lib/components/inspiration/labels.js";
	import { KNOWN_IDS, PUBLISHED } from "$lib/inspiration/catalog.js";
	import {
		EMPTY_FILTERS,
		activeChips,
		applyFilters,
		clearFilters,
		facetCounts,
		parseFilters,
		serializeFilters,
		toggleFacet,
		type Facet,
		type Filters,
	} from "$lib/inspiration/query.js";
	import type { Reference, Sort } from "$lib/inspiration/types.js";
	import { createSavedState } from "$lib/stores/saved.svelte.js";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	const PAGE_SIZE = 24;
	const SEARCH_DEBOUNCE_MS = 200;

	let ready = $state(false);
	onMount(() => (ready = true));

	// The catalog is already in the client bundle (filtering needs it); only
	// the barrel-derived framework map comes from the server.
	const entries = PUBLISHED;
	// One framework index for the badges, the filter and the counts.
	const frameworksOf = (entry: Reference) => cardFrameworks(entry, data.frameworks);

	const filters = $derived<Filters>(ready ? parseFilters(page.url.searchParams) : EMPTY_FILTERS);
	const results = $derived(applyFilters(entries, filters, frameworksOf));
	const total = entries.length;

	const groups = $derived(
		TOOLBAR_FACETS.map((facet) => ({
			facet,
			title: FACET_TITLES[facet],
			counts: facetCounts(entries, facet, FACET_LABELS[facet], frameworksOf),
		})).filter((group) => group.counts.length >= 2)
	);

	// "Load more", reset whenever the filters change.
	let limit = $state(PAGE_SIZE);
	const filterKey = $derived(serializeFilters(filters));
	$effect(() => {
		void filterKey;
		limit = PAGE_SIZE;
	});
	const visible = $derived(results.slice(0, limit));

	const saved = createSavedState(KNOWN_IDS);
	const isSaved = (id: string) => ready && saved.list.includes(id);
	const toggleSaved = (entry: Reference) => saved.toggleSaved(entry.id);

	let searchOpen = $state(false);

	// ─── URL writes ─────────────────────────────────────────────────────────
	let query = $state("");
	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	/** The `q` this page last put in the URL; any other value came from outside. */
	let lastWrittenQ: string | null = null;

	const normalizeQ = (q: string) => q.trim().slice(0, 80);

	function cancelSearch() {
		clearTimeout(searchTimer);
		searchTimer = undefined;
	}

	/** Every write carries the field's current text, so a pending search never lands as a second entry. */
	function navigate(next: Filters, replaceState = false) {
		cancelSearch();
		const target = { ...next, q: normalizeQ(next.q) };
		const search = serializeFilters(target);
		if (search === serializeFilters(filters)) return;
		lastWrittenQ = target.q;
		goto(`/inspiration${search}`, { replaceState, keepFocus: true, noScroll: true });
	}

	function commitQuery() {
		// One history entry per search: the first committed query pushes, the
		// keystrokes after it refine that same entry.
		navigate({ ...filters, q: query }, filters.q !== "");
	}

	function onQueryInput() {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(commitQuery, SEARCH_DEBOUNCE_MS);
	}

	$effect(() => cancelSearch);

	// Leaving (a card, the header, Back): a search still pending must not
	// pull the visitor back to the gallery.
	beforeNavigate(cancelSearch);

	// The URL changed under the field (Back/Forward, the home search, the
	// header link): show its query. Our own writes are skipped, so typing is
	// never overwritten.
	$effect(() => {
		if (!ready) return;
		const q = filters.q;
		if (q === lastWrittenQ) return;
		lastWrittenQ = q;
		query = q;
	});

	function onToggle(facet: Facet, value: string) {
		navigate({ ...toggleFacet(filters, facet, value as never), q: query });
	}

	function onSort(sort: Sort) {
		navigate({ ...filters, sort, q: query });
	}

	function onRemove(chip: ReturnType<typeof activeChips>[number]) {
		if (chip.facet === "q") {
			query = "";
			navigate({ ...filters, q: "" });
		} else if (chip.facet === "collection") {
			navigate({ ...filters, collection: null, q: query });
		} else {
			onToggle(chip.facet, chip.value);
		}
	}

	function onClear() {
		query = "";
		navigate(clearFilters(filters));
	}
</script>

<Seo
	title="Inspiration — UI interactions worth studying | FancyUI"
	description="A curated gallery of UI interactions: live FancyUI components you can retune and references from elsewhere, each with notes on why it works, when to use it and how to build it."
	path="/inspiration"
/>
<SiteFonts />

<div class="fx-root dark page">
	<SiteHeader current="inspiration" onSearchClick={() => (searchOpen = true)} />

	<main data-ready={ready || undefined}>
		<header class="head">
			<h1>Inspiration</h1>
			<p class="fx-mono sub">{total} references worth studying</p>
		</header>

		<GalleryToolbar
			{filters}
			bind:query
			{groups}
			{total}
			shown={results.length}
			{onQueryInput}
			onQuerySubmit={commitQuery}
			{onToggle}
			{onSort}
			{onRemove}
			{onClear}
		/>

		<section class="results" aria-label="References">
			{#if results.length === 0}
				<EmptyState
					title="Nothing matches these filters"
					body="Remove a filter or try a broader word."
				>
					<ActiveFilters {filters} {onRemove} {onClear} />
				</EmptyState>
			{:else}
				<CardGrid
					entries={visible}
					ports={data.frameworks}
					{isSaved}
					onToggleSaved={toggleSaved}
					label="References"
				/>
				{#if results.length > limit}
					<div class="more">
						<Button variant="outline" onclick={() => (limit += PAGE_SIZE)}>
							Load more <span class="fx-mono more-count">{results.length - limit}</span>
						</Button>
					</div>
				{/if}
			{/if}
		</section>
	</main>

	<SiteFooter />
</div>

<CommandSearch bind:open={searchOpen} />

<style>
	.page {
		min-height: 100vh;
		overflow-x: clip;
	}

	main {
		max-width: 1440px;
		margin: 0 auto;
		padding: 0 40px 96px;
	}

	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 8px 20px;
		padding: 40px 0 28px;
	}

	h1 {
		font-size: 44px;
		line-height: 1.05;
		font-weight: 700;
		letter-spacing: -0.03em;
	}

	.sub {
		font-size: 11.5px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--fx-ink-3);
	}

	.results {
		margin-top: 24px;
	}

	.more {
		display: flex;
		justify-content: center;
		margin-top: 40px;
	}

	.more-count {
		font-size: 11px;
		color: var(--fx-ink-3);
	}

	@media (max-width: 700px) {
		main {
			padding: 0 16px 64px;
		}
		.head {
			padding: 28px 0 20px;
		}
		h1 {
			font-size: 34px;
		}
	}
</style>
