<script lang="ts" module>
	import type { Snippet } from "svelte";

	/**
	 * Props for ChatPanel
	 */
	export interface ChatPanelProps {
		/** Whether a reply is still arriving. Pins the scroll region to its bottom while true. */
		streaming?: boolean;
		/** Renders `emptyState` in place of `children` — a conversation with no turns yet. */
		empty?: boolean;
		/** Label on the pill that appears once the reader scrolls away from the bottom. */
		returnLabel?: string;
		/** Accessible name for the panel as a whole. */
		label?: string;
		/** Sticky top region: a title, a model name, a close button. */
		header?: Snippet;
		/** The message stream, filling the scroll region. */
		children?: Snippet;
		/** Sticky bottom region — where `Composer` belongs. */
		composer?: Snippet;
		/** Rendered instead of `children` while `empty` — where `ChatEmptyState` belongs. */
		emptyState?: Snippet;
		/** Additional CSS classes */
		class?: string;
		/** The root element */
		ref?: HTMLDivElement | null;
	}
</script>

<script lang="ts">
	import { onMount, untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import { autoscroll, scrollToBottom } from "../_internals/autoscroll.js";

	let {
		streaming = false,
		empty = false,
		returnLabel = "Jump to latest",
		label = "Conversation",
		header,
		children,
		composer,
		emptyState,
		class: className,
		ref = $bindable(null),
	}: ChatPanelProps = $props();

	/** How close to the bottom (px) still counts as pinned — the action's own default. */
	const BOTTOM_THRESHOLD = 40;

	let scrollEl = $state<HTMLDivElement | null>(null);
	// The transcript itself. The scroll region has a fixed height, so it never
	// resizes; its content is what grows when an image lands or a font swaps in.
	let contentEl = $state<HTMLDivElement | null>(null);

	// Content that fits its container counts as pinned, so the pill starts hidden
	// and the first sync corrects it if the transcript is already taller.
	let stuck = $state(true);

	/**
	 * Whether the reader has taken the scrollbar over. Until they have, the panel
	 * still counts as opening, and every batch of arriving content lands it at the
	 * latest turn — a transcript that renders a frame after mount would otherwise
	 * open at the top of a conversation nobody asked to re-read.
	 */
	let touched = false;
	/** Suppresses the scroll event our own snap is about to produce. */
	let selfScroll = false;
	/** Batches a burst of mutations into one read of the geometry. */
	let frame: number | null = null;

	/**
	 * The pill's visibility is tracked here rather than through the action's
	 * `onStickChange`, because the action releases every listener the moment
	 * `enabled` goes false — which is most of the time, since it is only enabled
	 * while a reply streams. A reader scrolling up between replies would
	 * otherwise never be offered the way back.
	 */
	function syncStuck(): void {
		const el = scrollEl;
		if (!el) return;
		stuck = el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_THRESHOLD;
	}

	function prefersReducedMotion(): boolean {
		if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
		return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	}

	/**
	 * Every scroll the panel performs on its own behalf goes through here, so the
	 * scroll event it produces is not mistaken for the reader reaching for the
	 * scrollbar. One frame is enough to tell the two apart: a scroll event is
	 * delivered before the next frame's callbacks run. The guard is only armed if
	 * the scrollbar actually moved — a panel that was already at its bottom edge
	 * emits no event to suppress, and suppressing nothing would swallow the
	 * reader's next real scroll instead.
	 */
	function snap(el: HTMLElement, behavior: ScrollBehavior): void {
		const before = el.scrollTop;
		scrollToBottom(el, behavior);
		if (el.scrollTop === before) return;
		selfScroll = true;
		requestAnimationFrame(() => (selfScroll = false));
	}

	function handleScroll(): void {
		if (!selfScroll) touched = true;
		syncStuck();
	}

	/**
	 * Content growing under a scrollbar that never moved fires no scroll event, so
	 * without this the pill would stay hidden through an entire reply arriving
	 * below a reader who had scrolled up — and a transcript rendered after mount
	 * would leave the panel at the top of the thread.
	 */
	function handleMutation(): void {
		if (frame !== null) return;
		frame = requestAnimationFrame(() => {
			frame = null;
			const el = scrollEl;
			if (!el) return;
			if (!touched && !empty) snap(el, "instant");
			syncStuck();
		});
	}

	function jumpToLatest(): void {
		const el = scrollEl;
		if (!el) return;
		// The pill is about to disappear under the pointer, which would leave the
		// keyboard with nothing focused. Handing focus to the scroll region keeps
		// the reader where they were and lets them carry on with the arrow keys.
		el.focus({ preventScroll: true });
		snap(el, prefersReducedMotion() ? "instant" : "smooth");
	}

	/**
	 * Re-reads the geometry the pill is gated on. The flags arrive as arguments so
	 * the effect below depends on exactly those two and on nothing the read itself
	 * touches — `syncStuck` writes `stuck` and never reads it, so this cannot feed
	 * itself.
	 */
	function reseed(_streaming: boolean, _empty: boolean): void {
		untrack(syncStuck);
	}

	// A conversation opens at its latest turn, the way every conversation does.
	// Instant rather than smooth: there is no journey to show on first paint, and
	// a smooth scroll still in flight reads as "not at the bottom" to the stick
	// tracking above. Reads `scrollEl` and nothing else, so it runs once.
	$effect(() => {
		const el = scrollEl;
		if (!el) return;
		snap(el, "instant");
		syncStuck();
	});

	// The empty state taking the transcript's place, or a reply starting to grow
	// it, both change what the region holds without moving its scrollbar.
	$effect(() => {
		reseed(streaming, empty);
	});

	onMount(() => {
		const el = scrollEl;
		if (!el) return;
		const growth = new MutationObserver(handleMutation);
		growth.observe(el, { childList: true, subtree: true, characterData: true });

		// A mutation is not the only way the transcript gets taller: an image
		// finishing its download, a web font swapping in, or a block expanding
		// under CSS changes the height with the DOM untouched, and the pill would
		// go on claiming the reader is at the end.
		let resize: ResizeObserver | null = null;
		if (contentEl && typeof ResizeObserver !== "undefined") {
			resize = new ResizeObserver(handleMutation);
			resize.observe(contentEl);
		}

		return () => {
			growth.disconnect();
			resize?.disconnect();
			if (frame !== null) cancelAnimationFrame(frame);
			frame = null;
		};
	});
</script>

<div
	bind:this={ref}
	class={cn(
		"ft-panel bg-card text-card-foreground flex h-full flex-col overflow-hidden rounded-xl border",
		className
	)}
	role="region"
	aria-label={label}
	data-streaming={streaming ? "" : undefined}
	data-empty={empty ? "" : undefined}
>
	{#if header}
		<!--
			Sticky without `position: sticky`: the shell is a flex column whose middle
			row is the only one allowed to grow, so the two ends simply never scroll.
		-->
		<div class="ft-panel-header border-border flex-none border-b">
			{@render header()}
		</div>
	{/if}

	<div class="ft-panel-viewport relative min-h-0 flex-1">
		<!--
			`min-h-0` on the wrapper is what lets this row shrink below its content:
			without it a flex item refuses to go under its intrinsic height and the
			whole panel grows instead of scrolling. The region is focusable because a
			keyboard has no other way to scroll it, and its ring is drawn inset — the
			region fills the wrapper edge to edge, so a ring outside its border box
			would be clipped away by the shell's `overflow-hidden`. It carries no role
			of its own: the panel around it is already the named `Conversation`
			region, and a `log` here would have a screen reader read every streamed
			token back out loud.
		-->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div
			bind:this={scrollEl}
			class="ft-panel-scroll focus-visible:ring-ring h-full overflow-y-auto focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
			tabindex="0"
			onscroll={handleScroll}
			use:autoscroll={{ enabled: streaming }}
		>
			<!--
				A stable wrapper around whichever branch renders, so there is one
				element to watch for height changes whether the panel is empty or not.
			-->
			<div bind:this={contentEl}>
				{#if empty}
					{@render emptyState?.()}
				{:else}
					{@render children?.()}
				{/if}
			</div>
		</div>

		{#if !stuck}
			<button
				type="button"
				class="ft-panel-return bg-card text-foreground border-border hover:bg-muted focus-visible:ring-ring absolute inset-x-0 z-10 mx-auto flex w-fit cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
				onclick={jumpToLatest}
			>
				<svg
					class="size-3.5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M12 5v14" />
					<path d="m19 12-7 7-7-7" />
				</svg>
				{returnLabel}
			</button>
		{/if}
	</div>

	{#if composer}
		<div class="ft-panel-composer border-border bg-card flex-none border-t">
			{@render composer()}
		</div>
	{/if}
</div>

<style>
	/*
	 * How far the pill floats above the composer. The only geometry worth
	 * exposing: everything else about the pill is a utility a consumer can
	 * out-specify through `class` on the panel.
	 */
	.ft-panel-return {
		bottom: var(--ft-panel-return-offset, 0.75rem);
	}

	@media (prefers-reduced-motion: no-preference) {
		.ft-panel-return {
			animation: ft-panel-return-in 180ms cubic-bezier(0.4, 0, 0.2, 1) both;
		}
	}

	@keyframes ft-panel-return-in {
		from {
			opacity: 0;
			transform: translateY(0.375rem);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
