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
		searchTerms,
		serializeFilters,
		toggleFacet,
		type Facet,
		type Filters,
	} from "$lib/inspiration/query.js";
	import type { Reference, Sort } from "$lib/inspiration/types.js";
	import { createSavedState } from "$lib/stores/saved.svelte.js";
	import type { UnderstoodChip, Understanding } from "$lib/server/understand.js";
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

	// ─── Reading a sentence as filters ──────────────────────────────────────
	// A sentence of a few words ("a button that glows on hover") goes to the
	// interpreter on Enter; a confident answer becomes facets + a subject word,
	// shown as "Understood as …" with a way back to the exact words. Without
	// the interpreter (no key, error, slow) the words are searched as usual.
	const INTERPRET_MIN_TERMS = 3;
	const INTERPRET_TIMEOUT_MS = 2500;

	interface Understood {
		sentence: string;
		chips: UnderstoodChip[];
		before: Filters;
	}
	let understood = $state<Understood | null>(null);
	let interpreting = $state(false);
	let interpretController: AbortController | undefined;

	const wantsInterpretation = (text: string) => searchTerms(text).length >= INTERPRET_MIN_TERMS;

	async function interpret(
		sentence: string,
		base: Filters,
		replaceState: boolean
	): Promise<boolean> {
		interpretController?.abort();
		const controller = new AbortController();
		interpretController = controller;
		const timer = setTimeout(() => controller.abort(), INTERPRET_TIMEOUT_MS);
		interpreting = true;
		try {
			const response = await fetch("/api/inspiration/understand", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ query: sentence }),
				signal: controller.signal,
			});
			if (!response.ok) return false;
			const body = (await response.json()) as { understanding?: Understanding };
			const reading = body.understanding;
			if (!reading || reading.chips.length === 0) return false;
			const next: Filters = {
				...base,
				interaction: [...new Set([...base.interaction, ...reading.interaction])].sort(),
				style: [...new Set([...base.style, ...reading.style])].sort(),
				q: reading.subject ?? "",
			};
			understood = { sentence, chips: reading.chips, before: base };
			query = next.q;
			navigate(next, replaceState);
			return true;
		} catch {
			return false;
		} finally {
			clearTimeout(timer);
			if (interpretController === controller) {
				interpreting = false;
				interpretController = undefined;
			}
		}
	}

	async function submitQuery() {
		cancelSearch();
		understood = null;
		const sentence = query.trim();
		if (wantsInterpretation(sentence) && (await interpret(sentence, filters, false))) return;
		commitQuery();
	}

	/** Back to the words as typed, without the facets the interpreter added. */
	function useExactWords() {
		if (!understood) return;
		const { sentence, before } = understood;
		understood = null;
		query = sentence;
		navigate({ ...before, q: sentence }, true);
	}

	// Arriving from the home search (`?ask=1`): read the sentence once, then
	// drop the flag so a reload or a shared link stays a plain search.
	let askHandled = false;
	$effect(() => {
		if (!ready || askHandled) return;
		askHandled = true;
		if (page.url.searchParams.get("ask") !== "1") return;
		const sentence = filters.q;
		const base = filters;
		void (async () => {
			if (wantsInterpretation(sentence) && (await interpret(sentence, base, true))) return;
			goto(`/inspiration${serializeFilters(base)}`, {
				replaceState: true,
				keepFocus: true,
				noScroll: true,
			});
		})();
	});

	// Any change the visitor makes afterwards is theirs, not the interpreter's.
	function forgetUnderstanding() {
		understood = null;
	}

	$effect(() => () => interpretController?.abort());

	function onQueryInput() {
		forgetUnderstanding();
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
		forgetUnderstanding();
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
		forgetUnderstanding();
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
			onQuerySubmit={submitQuery}
			{onToggle}
			{onSort}
			{onRemove}
			{onClear}
		/>

		<p class="understood" aria-live="polite">
			{#if interpreting}
				<span class="fx-mono label">Reading your request…</span>
			{:else if understood}
				<span class="fx-mono label">Understood as</span>
				{#each understood.chips as chip (chip.facet + chip.value)}
					<span class="chip" title="Confidence {Math.round(chip.confidence * 100)}%"
						>{chip.label}<span class="fx-mono conf" aria-hidden="true"
							>{Math.round(chip.confidence * 100)}%</span
						><span class="sr-only">, confidence {Math.round(chip.confidence * 100)} percent</span
						></span
					>
				{/each}
				<button type="button" class="exact" onclick={useExactWords}
					>Search the exact words instead</button
				>
			{/if}
		</p>

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
		margin-top: 16px;
	}

	.understood {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 10px;
		min-height: 28px;
		margin-top: 12px;
		font-size: 13px;
		color: var(--fx-ink-2);
	}

	.understood .label {
		font-size: 11px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--fx-ink-3);
	}

	.understood .chip {
		display: inline-flex;
		align-items: baseline;
		gap: 6px;
		padding: 3px 10px;
		border-radius: 999px;
		color: var(--fx-ink);
		box-shadow: inset 0 0 0 1px var(--fx-hairline-strong);
	}

	.understood .conf {
		font-size: 10.5px;
		color: var(--fx-ink-3);
	}

	.understood .exact {
		color: var(--fx-ink-2);
		text-decoration: underline;
		text-underline-offset: 3px;
		cursor: pointer;
	}

	.understood .exact:hover {
		color: var(--fx-ink);
	}

	@media (pointer: coarse) {
		.understood .exact {
			min-height: 40px;
		}
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
