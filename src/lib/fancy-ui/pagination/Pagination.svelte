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
		/**
		 * Plays the select cue through the sound controller. Off by default;
		 * only audible once the user has enabled sound.
		 */
		sound?: boolean;
	}
</script>

<script lang="ts">
	import { tick, untrack } from "svelte";
	import { flip } from "svelte/animate";
	import { fade } from "svelte/transition";
	import { expoOut } from "svelte/easing";
	import { cn } from "$lib/utils.js";
	import { createReducedMotion } from "../_internals/motion/media-query.svelte.js";
	import { DURATIONS } from "../_internals/motion/tokens.js";
	import { buildPageRange } from "./pagination-range.js";
	import { sound as soundFx } from "../sound/sound.svelte.js";

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
		sound = false,
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

	// The current-page pill slides from the old page to the new one — but it
	// must not fly in on first paint, from wherever an unplaced box sits. So
	// the slide is armed only once the page has really moved, and the flag is
	// a `data-*` attribute the CSS selects on rather than a class (nothing
	// else keys off it, and it stays out of the merged class string).
	//
	// Armed off `safePage`, not from inside `goTo()`: a controlled `Pagination`
	// whose `page` prop is changed from outside never calls `goTo`, and its pill
	// should slide just the same. `untrack` seeds the baseline with the page the
	// component started on without making the seed itself reactive.
	let popArmed = $state(false);
	let lastPage = untrack(() => safePage);
	$effect(() => {
		if (safePage === lastPage) return;
		lastPage = safePage;
		popArmed = true;
	});

	/*
	 * ---------------------------------------------------------------------
	 * The sliding pill
	 * ---------------------------------------------------------------------
	 *
	 * One `aria-hidden` box under the numbers, moved with `translate()` alone
	 * to the current page's button (every page button is the same size, so
	 * position is all it needs). When the run of numbers itself shifts — a new
	 * window after a jump, an ellipsis moving — the numbers glide to their new
	 * places with `animate:flip` on the same duration, so the pill and its
	 * number arrive together.
	 *
	 * A progressive enhancement, never the only signal: the current button
	 * keeps `aria-current="page"` and its own `bg-accent`, which the CSS only
	 * hides once the pill has actually been placed (`data-indicator`). A
	 * JS-off render, a forced-colors user and a screen reader all still get it.
	 */
	const SLIDE_MS = DURATIONS.base;
	const reduced = createReducedMotion();
	$effect(() => reduced.start());

	let indicatorRef = $state<HTMLSpanElement | null>(null);
	let indicatorPlaced = $state(false);
	const flipDuration = $derived(reduced.current ? 0 : SLIDE_MS);

	function placeIndicator(animate: boolean) {
		const el = indicatorRef;
		const current = ref?.querySelector<HTMLElement>('button[aria-current="page"]');
		if (!el || !current || current.offsetWidth === 0) {
			indicatorPlaced = false;
			return;
		}
		// Sum offsets up to the nav rather than trusting `offsetLeft` alone:
		// while `animate:flip` runs, each `<li>` carries a transform, which
		// makes it the button's `offsetParent` (offset ≈ 0). Offsets ignore
		// transforms, so the sum is the button's final place — where the pill
		// must land, together with the number gliding there.
		let x = 0;
		let y = 0;
		for (let n: HTMLElement | null = current; n && n !== ref; ) {
			x += n.offsetLeft;
			y += n.offsetTop;
			n = n.offsetParent as HTMLElement | null;
		}
		const transform = `translate(${x}px, ${y}px)`;
		el.style.width = `${current.offsetWidth}px`;
		el.style.height = `${current.offsetHeight}px`;
		if (el.style.transform === transform) {
			indicatorPlaced = true;
			return;
		}
		if (animate && el.style.transform) {
			el.style.transform = transform;
		} else {
			// Snap: suspend the transition, write, force a reflow, restore.
			const previous = el.style.transition;
			el.style.transition = "none";
			el.style.transform = transform;
			void el.offsetWidth;
			el.style.transition = previous;
		}
		indicatorPlaced = true;
	}

	// Re-place after every page or range change, once the DOM has the new
	// buttons. Slides once armed; the first placement snaps.
	$effect(() => {
		void safePage;
		void items;
		void indicatorRef;
		const animate = untrack(() => popArmed);
		tick().then(() => placeIndicator(animate));
	});

	// Resizes, font loads and zoom move the buttons without a page change:
	// follow them with a snap, never a slide.
	$effect(() => {
		const nav = ref;
		if (!nav || typeof ResizeObserver === "undefined") return;
		const ro = new ResizeObserver(() => placeIndicator(false));
		ro.observe(nav);
		return () => ro.disconnect();
	});

	function goTo(next: number) {
		if (disabled) return;
		const clamped = Math.max(1, Math.min(Math.floor(next), Math.max(safeCount, 1)));
		if (clamped === page) return;
		page = clamped;
		if (sound) soundFx.play("select");
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

<nav
	bind:this={ref}
	aria-label={label}
	data-armed={popArmed ? "true" : undefined}
	data-indicator={indicatorPlaced ? "" : undefined}
	class={cn("ft-pagination", className)}
>
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
			<li
				animate:flip={{ duration: flipDuration, easing: expoOut }}
				in:fade={{ duration: flipDuration ? DURATIONS.fast : 0, delay: flipDuration ? 60 : 0 }}
			>
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

	<span bind:this={indicatorRef} class="ft-pagination-indicator" aria-hidden="true"></span>
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

	/*
	 * The nav is the page buttons' `offsetParent` (no `<ul>`/`<li>` in between
	 * is positioned), so `offsetLeft`/`offsetTop` and the pill's own
	 * `left: 0; top: 0` share one origin. `isolation` lets the pill sit at
	 * `z-index: -1` — above the nav's background, under the buttons.
	 */
	.ft-pagination {
		position: relative;
		isolation: isolate;
	}

	.ft-pagination-indicator {
		position: absolute;
		left: 0;
		top: 0;
		z-index: -1;
		pointer-events: none;
		border-radius: var(--radius-md, 0.375rem);
		background: var(--ft-pagination-indicator-color, var(--color-accent));
		opacity: 0;
	}

	.ft-pagination[data-indicator] .ft-pagination-indicator {
		opacity: 1;
	}

	/* The pill has taken over: the current button's own fill steps aside. */
	.ft-pagination[data-indicator] button[aria-current="page"] {
		background: transparent;
	}

	/*
	 * 300ms = tokens.DURATIONS.base, cubic-bezier(0.16, 1, 0.3, 1) =
	 * tokens.EASINGS.out — the same curve and length as the numbers' own
	 * `animate:flip`, so the pill lands with its number. Gated: under reduced
	 * motion the pill still follows the page, it just arrives.
	 */
	@media (prefers-reduced-motion: no-preference) {
		.ft-pagination[data-armed="true"] .ft-pagination-indicator {
			transition: transform
				var(
					--ft-pagination-slide-duration,
					var(--ft-pagination-pop-duration, var(--ft-duration-base, 300ms))
				)
				var(--ft-ease-out, cubic-bezier(0.16, 1, 0.3, 1));
		}
	}
</style>
