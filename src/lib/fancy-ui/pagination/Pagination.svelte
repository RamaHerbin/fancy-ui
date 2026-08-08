<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface PaginationProps {
		/** The current page, 1-based. Bindable. */
		page?: number;
		/** Total number of pages. */
		count: number;
		/** Called with the new page whenever it changes, however the change happened. */
		onPageChange?: (page: number) => void;
		/** Pages shown on each side of the current page. Defaults to `1`. */
		siblingCount?: number;
		/** Pages always shown at each end of the run. Defaults to `1`. */
		boundaryCount?: number;
		/** Shows First/Last jump buttons alongside Previous/Next. Defaults to `false`. */
		showEdges?: boolean;
		/** Disables every control in the nav. */
		disabled?: boolean;
		/** Accessible name for the `<nav>` landmark. Defaults to `"Pagination"`. */
		label?: string;
		/** Overrides the Previous button's content. */
		previousLabel?: Snippet;
		/** Overrides the Next button's content. */
		nextLabel?: Snippet;
		/** Additional CSS classes */
		class?: string;
		/** Element reference */
		ref?: HTMLElement | null;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { buildPageRange } from "./pagination-range.js";

	let {
		page = $bindable(1),
		count,
		onPageChange,
		siblingCount = 1,
		boundaryCount = 1,
		showEdges = false,
		disabled = false,
		label = "Pagination",
		previousLabel,
		nextLabel,
		class: className,
		ref = $bindable(null),
	}: PaginationProps = $props();

	const items = $derived(buildPageRange(page, count, siblingCount, boundaryCount));

	// Floored, not just clamped, and used everywhere this component reasons
	// about "which page" rather than trusting the raw props: `count` can
	// arrive fractional (`totalItems / pageSize` without `Math.ceil`).
	// Without a floored value here, `handleLast` would call `goTo(count)` and
	// set `page` itself to that same fractional value — `buildPageRange`'s
	// own flooring would still save the *rendered* sequence, but `item ===
	// page` in the template below would compare an integer against a value
	// that can now never match again, so `aria-current` and the pill styling
	// would stay wrong for the rest of the session. See `pagination-range.ts`
	// for why the pure function floors independently of this — both layers
	// guard the same invariant on purpose, the same redundancy the boundary
	// buttons already rely on below.
	const safeCount = $derived(Math.max(0, Math.floor(count)));
	const safePage = $derived(Math.min(Math.max(Math.floor(page), 1), Math.max(safeCount, 1)));

	const isFirst = $derived(safePage <= 1);
	const isLast = $derived(safePage >= safeCount);

	function goTo(next: number) {
		if (disabled) return;
		const clamped = Math.max(1, Math.min(Math.floor(next), Math.max(safeCount, 1)));
		if (clamped === page) return;
		page = clamped;
		onPageChange?.(clamped);
	}

	// Each handler re-checks the boundary itself rather than trusting the
	// `disabled` attribute below — a synthetic click bypasses the native
	// guard, as does `fireEvent.click` in tests.
	function handlePrevious() {
		if (disabled || isFirst) return;
		goTo(safePage - 1);
	}
	function handleNext() {
		if (disabled || isLast) return;
		goTo(safePage + 1);
	}
	function handleFirst() {
		if (disabled || isFirst) return;
		goTo(1);
	}
	function handleLast() {
		if (disabled || isLast) return;
		goTo(safeCount);
	}

	const pageButtonBase =
		"inline-flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50";
	const navButtonBase =
		"inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50";
</script>

<nav bind:this={ref} aria-label={label} class={cn("ft-pagination", className)}>
	<ul class="flex items-center gap-1">
		{#if showEdges}
			<li>
				<button
					type="button"
					class={navButtonBase}
					disabled={disabled || isFirst}
					aria-label="First page"
					title="First page"
					onclick={handleFirst}
				>
					« First
				</button>
			</li>
		{/if}

		<li>
			<button
				type="button"
				class={navButtonBase}
				disabled={disabled || isFirst}
				aria-label="Previous page"
				title="Previous page"
				onclick={handlePrevious}
			>
				{#if previousLabel}
					{@render previousLabel()}
				{:else}
					‹ Previous
				{/if}
			</button>
		</li>

		{#each items as item, i (item === "ellipsis" ? `ellipsis-${i}` : `page-${item}`)}
			<li>
				{#if item === "ellipsis"}
					<!-- Decorative only: it stands for a run of hidden pages, not a
					     control, so it must not take focus or be reachable by Tab. -->
					<span
						aria-hidden="true"
						class="text-muted-foreground flex size-8 items-center justify-center select-none"
					>
						…
					</span>
				{:else}
					<button
						type="button"
						class={cn(
							pageButtonBase,
							item === safePage
								? "bg-accent text-accent-foreground"
								: "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
						)}
						{disabled}
						aria-current={item === safePage ? "page" : undefined}
						aria-label={`Go to page ${item}`}
						title={`Go to page ${item}`}
						onclick={() => goTo(item)}
					>
						{item}
					</button>
				{/if}
			</li>
		{/each}

		<li>
			<button
				type="button"
				class={navButtonBase}
				disabled={disabled || isLast}
				aria-label="Next page"
				title="Next page"
				onclick={handleNext}
			>
				{#if nextLabel}
					{@render nextLabel()}
				{:else}
					Next ›
				{/if}
			</button>
		</li>

		{#if showEdges}
			<li>
				<button
					type="button"
					class={navButtonBase}
					disabled={disabled || isLast}
					aria-label="Last page"
					title="Last page"
					onclick={handleLast}
				>
					Last »
				</button>
			</li>
		{/if}
	</ul>
</nav>

<style>
	/*
	 * The current-page pill reads the app's semantic `bg-accent` token (the
	 * mockup's neutral highlight, not the brand purple) — Pagination never
	 * needs the purple accent for its own surface. The focus ring is the one
	 * place this component reaches for the shared nav accent, matching
	 * ToggleGroupItem's identical `--ft-toggle-group-accent` pattern: no
	 * semantic token owns "focus ring purple", so it is declared locally
	 * with a light-dark() fallback, retintable from higher up the tree via
	 * `--ft-accent`.
	 */
	.ft-pagination {
		--ft-nav-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
	}

	.ft-pagination button:focus-visible {
		box-shadow: 0 0 0 3px color-mix(in oklab, var(--ft-nav-accent) 35%, transparent);
	}
</style>
