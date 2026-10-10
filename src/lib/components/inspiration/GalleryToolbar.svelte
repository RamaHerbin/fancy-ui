<!--
	The gallery's controls: the search field (the site's SearchGlow), the sort
	switch, one chip row per facet, the active filters and the result count.
	Presentational — the page owns the URL and passes callbacks.
-->
<script lang="ts">
	import { SearchGlow } from "$lib/components/site/materials/index.js";
	import type { activeChips, Facet, FacetCount, Filters } from "$lib/inspiration/query.js";
	import type { Sort } from "$lib/inspiration/types.js";
	import ActiveFilters from "./ActiveFilters.svelte";
	import FacetChips from "./FacetChips.svelte";

	type Chip = ReturnType<typeof activeChips>[number];

	interface Props {
		filters: Filters;
		query: string;
		groups: { facet: Facet; title: string; counts: FacetCount[] }[];
		total: number;
		shown: number;
		onQueryInput: () => void;
		onQuerySubmit: () => void;
		onToggle: (facet: Facet, value: string) => void;
		onSort: (sort: Sort) => void;
		onRemove: (chip: Chip) => void;
		onClear: () => void;
	}

	let {
		filters,
		query = $bindable(),
		groups,
		total,
		shown,
		onQueryInput,
		onQuerySubmit,
		onToggle,
		onSort,
		onRemove,
		onClear,
	}: Props = $props();

	const SORT_LABELS: Record<Sort, string> = { curated: "Curated", latest: "Latest" };
</script>

<div class="gt">
	<div class="row">
		<!-- The field's own submit navigates to `?q=` alone; capturing it here
		     keeps the other filters in the URL. -->
		<div
			class="search"
			oninput={onQueryInput}
			onsubmitcapture={(event) => {
				event.preventDefault();
				event.stopPropagation();
				onQuerySubmit();
			}}
		>
			<SearchGlow bind:value={query} placeholder="Describe an interaction…" seed={2} />
		</div>
		<div class="sort fx-mono" role="group" aria-label="Sort">
			{#each ["curated", "latest"] as const as sort (sort)}
				<button type="button" aria-pressed={filters.sort === sort} onclick={() => onSort(sort)}
					>{SORT_LABELS[sort]}</button
				>
			{/each}
		</div>
	</div>

	{#if groups.length}
		<div class="facets">
			{#each groups as group (group.facet)}
				<FacetChips
					title={group.title}
					counts={group.counts}
					selected={filters[group.facet]}
					onToggle={(value) => onToggle(group.facet, value)}
				/>
			{/each}
		</div>
	{/if}

	<div class="status">
		<p class="count fx-mono" aria-live="polite">
			{shown} of {total}
		</p>
		<ActiveFilters {filters} {onRemove} {onClear} />
	</div>
</div>

<style>
	.gt {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.search {
		flex: 1;
		max-width: 720px;
		min-width: 0;
	}

	.sort {
		display: inline-flex;
		flex: none;
		padding: 3px;
		margin-left: auto;
		border-radius: 10px;
		box-shadow: inset 0 0 0 1px var(--fx-hairline);
	}

	.sort button {
		height: 30px;
		padding: 0 12px;
		border-radius: 7px;
		font-size: 11px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--fx-ink-3);
		cursor: pointer;
		transition:
			color 180ms var(--fx-ease),
			background-color 180ms var(--fx-ease);
	}

	.sort button:hover {
		color: var(--fx-ink-2);
	}

	.sort button[aria-pressed="true"] {
		color: var(--fx-ink);
		background: var(--fx-card-raised);
		box-shadow: inset 0 0 0 1px var(--fx-hairline-strong);
	}

	.facets {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 16px 0;
		box-shadow:
			inset 0 1px 0 var(--fx-hairline),
			inset 0 -1px 0 var(--fx-hairline);
	}

	.status {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px 18px;
		min-height: 28px;
	}

	.count {
		font-size: 11px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--fx-ink-3);
	}

	@media (max-width: 700px) {
		.row {
			flex-direction: column;
			align-items: stretch;
		}
		.search {
			max-width: none;
		}
		.sort {
			align-self: flex-start;
			margin-left: 0;
		}
	}

	@media (pointer: coarse) {
		.sort button {
			min-height: 40px;
		}
	}
</style>
