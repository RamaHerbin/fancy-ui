<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { SearchResultData } from "../_internals/ai-types.js";

	/**
	 * Props for WebSearch
	 */
	export interface WebSearchProps {
		/** What the agent looked up, shown in the search-bar header */
		query: string;
		/** Hits found so far, oldest first; appending to it lands a new row */
		results: SearchResultData[];
		/** Whether the lookup is still running: drives the scanning bar and the waiting state */
		searching?: boolean;
		/** Called when a row is activated; supplying it turns every row into a button */
		onSelect?: (result: SearchResultData, index: number) => void;
		/** Replaces the built-in row body, keeping the row element and its behaviour */
		item?: Snippet<[SearchResultData, number]>;
		/** Rows shown before the expander takes over; `0` shows every result */
		maxVisible?: number;
		/** Accessible name for the whole block */
		label?: string;
		/** Additional CSS classes */
		class?: string;
		/** Element reference */
		ref?: HTMLDivElement | null;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { hostOf, monogram } from "../_internals/host.js";

	let {
		query,
		results,
		searching = false,
		onSelect,
		item,
		maxVisible = 0,
		label = "Web search",
		class: className,
		ref = $bindable(null),
	}: WebSearchProps = $props();

	const ROW_BASE =
		"ft-websearch-row flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left";
	const ROW_INTERACTIVE =
		"hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-ring cursor-pointer transition-colors focus-visible:ring-1 focus-visible:outline-none";

	const uid = $props.id();
	const listId = `${uid}-list`;

	let expanded = $state(false);

	// `0` — and any value below it, which would otherwise hide everything — means
	// the list is its own cap.
	const cap = $derived(maxVisible > 0 ? Math.floor(maxVisible) : results.length);
	const hiddenCount = $derived(Math.max(0, results.length - cap));

	// Expansion only means anything while something is hidden: with nothing behind
	// the cap there is no expanded state to be in, and the label and `aria-expanded`
	// would otherwise describe a button that is not on screen.
	const isExpanded = $derived(expanded && hiddenCount > 0);
	const visible = $derived(isExpanded || hiddenCount === 0 ? results : results.slice(0, cap));
	const countText = $derived(results.length === 1 ? "1 result" : `${results.length} results`);

	// An emptied list is a new search starting, not the old one still expanded: the
	// reader asked to see the rest of a result set that no longer exists, so the
	// request retires with it and the next set arrives capped like the first.
	$effect(() => {
		if (results.length === 0) expanded = false;
	});
</script>

<div
	bind:this={ref}
	class={cn("ft-websearch w-full text-sm", className)}
	role="group"
	aria-label={label}
	aria-busy={searching}
>
	<div
		class="ft-websearch-header border-border bg-background/60 flex items-center gap-2 rounded-lg border px-3 py-2"
	>
		<svg
			class="text-muted-foreground size-3.5 flex-none"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<circle cx="11" cy="11" r="7" />
			<path d="m20 20-3.6-3.6" />
		</svg>

		<span class="ft-websearch-query text-foreground min-w-0 flex-1 truncate" title={query}
			>{query}</span
		>

		{#if results.length > 0}
			<span class="ft-websearch-count text-muted-foreground flex-none text-xs tabular-nums"
				>{countText}</span
			>
		{/if}
	</div>

	<!--
		Decorative: `aria-busy` on the group already says the lookup is running, and
		the waiting line below says it in words while there is nothing to read.
	-->
	{#if searching}
		<div class="ft-websearch-scan mt-1.5" aria-hidden="true">
			<span class="ft-websearch-beam"></span>
		</div>
	{/if}

	{#if visible.length > 0}
		<ul id={listId} class="ft-websearch-list mt-1.5">
			<!--
				Keyed by id so an appended hit mounts as a fresh node and plays the
				entrance on its own, while the rows already on screen keep the DOM nodes
				they had — a CSS animation does not replay on an element that has one.
			-->
			{#each visible as result, index (result.id)}
				{@const domain = hostOf(result.url)}
				<li class="ft-websearch-item">
					{#snippet body()}
						{#if item}
							{@render item(result, index)}
						{:else}
							<!-- A row with no parsable host falls back to its title for the circle. -->
							<span class="ft-websearch-monogram" aria-hidden="true"
								>{monogram(domain || result.title)}</span
							>
							<span class="ft-websearch-text min-w-0 flex-1">
								<span class="ft-websearch-title text-foreground block truncate font-medium"
									>{result.title}</span
								>
								{#if domain}
									<span class="ft-websearch-domain text-muted-foreground block truncate text-xs"
										>{domain}</span
									>
								{/if}
								{#if result.snippet}
									<span class="ft-websearch-snippet text-muted-foreground mt-0.5 text-xs"
										>{result.snippet}</span
									>
								{/if}
							</span>
						{/if}
					{/snippet}

					{#if onSelect}
						<button
							type="button"
							class={cn(ROW_BASE, ROW_INTERACTIVE)}
							onclick={() => onSelect?.(result, index)}
						>
							{@render body()}
						</button>
					{:else if result.url}
						<!--
							Somebody else's page, arriving from a model: `nofollow ugc` keeps the
							host from vouching for it, and `noopener noreferrer` keeps the opened
							tab away from this one.
						-->
						<a
							class={cn(ROW_BASE, ROW_INTERACTIVE)}
							href={result.url}
							target="_blank"
							rel="noopener noreferrer nofollow ugc"
						>
							{@render body()}
						</a>
					{:else}
						<div class={ROW_BASE}>
							{@render body()}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{:else if searching}
		<p class="ft-websearch-status text-muted-foreground mt-1.5 px-2 text-xs">Searching…</p>
	{:else}
		<p class="ft-websearch-empty text-muted-foreground mt-1.5 px-2 text-xs">No results</p>
	{/if}

	{#if hiddenCount > 0}
		<button
			type="button"
			class="ft-websearch-more text-muted-foreground hover:text-foreground focus-visible:ring-ring mt-1 cursor-pointer rounded-md px-2 py-1 text-xs transition-colors focus-visible:ring-1 focus-visible:outline-none"
			aria-expanded={isExpanded}
			aria-controls={listId}
			onclick={() => (expanded = !isExpanded)}
		>
			{isExpanded ? "Show less" : `Show ${hiddenCount} more`}
		</button>
	{/if}
</div>

<style>
	.ft-websearch {
		/* Neutral surfaces are mixes of currentColor, so one set of values reads
		   correctly in both themes. The beam cannot do that — an accent that is a
		   fade of the text colour is not an accent — so it is read at its point of
		   use off the `--ft-status-*` vocabulary this family shares, whose defaults
		   are per-theme `light-dark()` pairs. */
		--ft-websearch-track: color-mix(in oklab, currentColor 12%, transparent);
		--ft-websearch-monogram-bg: color-mix(in oklab, currentColor 10%, transparent);
		--ft-websearch-scan-duration: 1.4s;
		--ft-websearch-enter-duration: 260ms;
		--ft-websearch-snippet-lines: 2;
	}

	.ft-websearch-list {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.ft-websearch-scan {
		position: relative;
		height: 2px;
		overflow: hidden;
		border-radius: 9999px;
		background: var(--ft-websearch-track);
	}

	/*
	 * Reduced motion gets a filled bar rather than a parked beam: a 40% sliver
	 * frozen at the left edge reads as a progress bar stuck at 40%, which is a
	 * claim this component cannot make.
	 */
	.ft-websearch-beam {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		border-radius: inherit;
		background: var(
			--ft-websearch-beam,
			var(--ft-status-running, light-dark(oklch(0.5 0.18 265), oklch(0.72 0.15 265)))
		);
		opacity: 0.45;
	}

	.ft-websearch-monogram {
		display: inline-flex;
		flex: none;
		align-items: center;
		justify-content: center;
		/* Sits on the middle of the title's line box rather than its top. */
		margin-top: 0.0625rem;
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 9999px;
		background: var(--ft-websearch-monogram-bg);
		font-size: 0.625rem;
		font-weight: 600;
		line-height: 1;
	}

	/* The clamp owns `display`, so the snippet carries no display utility. */
	.ft-websearch-snippet {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: var(--ft-websearch-snippet-lines);
		line-clamp: var(--ft-websearch-snippet-lines);
		overflow: hidden;
		line-height: 1.45;
	}

	/*
	 * Both animations live entirely inside `no-preference`, so reduced motion is
	 * not a degraded variant to keep in sync: a new row simply appears where it
	 * belongs, and the scanning bar is a steady tint instead of a sweep.
	 */
	@media (prefers-reduced-motion: no-preference) {
		.ft-websearch-item {
			animation: ft-websearch-enter var(--ft-websearch-enter-duration) cubic-bezier(0.16, 1, 0.3, 1);
		}

		.ft-websearch-beam {
			right: auto;
			width: 40%;
			opacity: 1;
			animation: ft-websearch-scan var(--ft-websearch-scan-duration) ease-in-out infinite;
		}
	}

	@keyframes ft-websearch-enter {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	/* 250% of a 40%-wide beam is one full track, so it leaves on the right exactly
	   as it entered on the left. */
	@keyframes ft-websearch-scan {
		from {
			transform: translateX(-100%);
		}
		to {
			transform: translateX(250%);
		}
	}
</style>
