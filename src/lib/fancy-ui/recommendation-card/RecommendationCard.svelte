<script lang="ts" module>
	import type { Snippet } from "svelte";

	/** Where a proposal stands: still on the table, taken up, or waved off. */
	export type RecommendationState = "open" | "accepted" | "dismissed";

	/**
	 * Props for RecommendationCard
	 */
	export interface RecommendationCardProps {
		/** What the agent is proposing, e.g. "Add an index on orders.customer_id". */
		title: string;
		/** Secondary muted line under the title — the reasoning, the expected effect. */
		description?: string;
		/**
		 * How sure the agent is, from 0 to 1. Omitted, the whole confidence block
		 * disappears rather than reading as zero. Out-of-range numbers are clamped.
		 */
		confidence?: number;
		/** Label for the confirm button. */
		acceptLabel?: string;
		/** Label for the decline button. */
		dismissLabel?: string;
		/** Called when the recommendation is accepted, after `state` has been written. */
		onAccept?: () => void;
		/** Called when the recommendation is dismissed, after `state` has been written. */
		onDismiss?: () => void;
		/** Where the recommendation stands. Bindable, so the answer is readable from outside. */
		state?: RecommendationState;
		/** Small kicker above the title, e.g. "Suggestion". */
		badge?: string;
		/** The detail region between the header and the footer — a snippet of the change. */
		children?: Snippet;
		/** Additional CSS classes */
		class?: string;
		/** The root element */
		ref?: HTMLDivElement | null;
	}
</script>

<script lang="ts">
	import { onMount, tick } from "svelte";
	import { cn } from "$lib/utils.js";
	import NumberTicker from "../number-ticker/NumberTicker.svelte";

	// `state` is renamed on the way in: a binding of that name in scope would turn
	// every `$state(...)` below into a store subscription, which is a compile-time
	// ambiguity Svelte resolves in the store's favour. The prop is still `state`.
	let {
		title,
		description,
		confidence,
		acceptLabel = "Apply",
		dismissLabel = "Dismiss",
		onAccept,
		onDismiss,
		state: current = $bindable("open"),
		badge,
		children,
		class: className,
		ref = $bindable(null),
	}: RecommendationCardProps = $props();

	/** Shown and spoken once the proposal is behind us. */
	const RESOLVED_LABELS = {
		accepted: "Applied",
		dismissed: "Dismissed",
	} as const;

	/** How long the percentage takes to count up, before the reduced-motion clamp. */
	const TICKER_MS = 900;

	/** Ring geometry. The radius picks the circumference the dash array runs on. */
	const RING_R = 13;
	const RING_C = 2 * Math.PI * RING_R;

	const isOpen = $derived(current === "open");
	const resolvedLabel = $derived(
		current === "accepted" ? RESOLVED_LABELS.accepted : RESOLVED_LABELS.dismissed
	);

	// A missing confidence is not a confidence of zero: the block only exists for
	// a real number, so `NaN` and `Infinity` are treated as "not reported".
	const hasConfidence = $derived(typeof confidence === "number" && Number.isFinite(confidence));
	const fraction = $derived(hasConfidence ? Math.min(1, Math.max(0, confidence as number)) : 0);
	const percent = $derived(Math.round(fraction * 100));

	/** Three bands, borrowing the run-status vocabulary the AI family already shares. */
	const band = $derived(fraction >= 0.75 ? "done" : fraction >= 0.5 ? "running" : "pending");

	let filled = $state(false);
	let reduced = $state(false);

	/** Where focus lands once the buttons it might have held are gone. */
	let resolvedRef: HTMLParagraphElement | null = null;

	// The ring starts empty and fills once the target is written, so its sweep runs
	// from a known origin — a transition never animates from a value the browser
	// has not painted yet.
	const sweep = $derived(filled ? fraction : 0);
	const ringOffset = $derived(RING_C * (1 - sweep));

	// The counter is JS-driven, so reduced motion is honoured by collapsing its
	// duration rather than by a media query: it lands on the number immediately.
	const tickerMs = $derived(Math.max(0.01, reduced ? 0 : TICKER_MS));

	onMount(() => {
		reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

		// Reduced motion wants the settled arc, not a fast one: write it in the same
		// breath so there is never a frame of empty ring to notice.
		if (reduced) {
			filled = true;
			return;
		}

		// `onMount` still runs inside the frame that mounted the card, so setting the
		// target here would land in the same paint as the empty ring and the browser
		// would have nothing to transition between. Two frames out is the guarantee:
		// the first callback can still belong to the mounting frame, the second
		// cannot, so the empty ring is on screen before the target is written.
		let second = 0;
		const first = requestAnimationFrame(() => {
			second = requestAnimationFrame(() => {
				filled = true;
			});
		});

		return () => {
			cancelAnimationFrame(first);
			cancelAnimationFrame(second);
		};
	});

	/**
	 * The answer is written to `state` before the callback fires, so a consumer
	 * reading the bound value from inside its own handler already sees it.
	 * Re-entry is refused rather than re-announced: a proposal resolves once.
	 */
	function decide(next: "accepted" | "dismissed") {
		if (current !== "open") return;
		current = next;
		if (next === "accepted") onAccept?.();
		else onDismiss?.();
		// The button just pressed is about to leave the DOM along with the rest of
		// the action group, so focus is moved to the verdict once it has painted —
		// otherwise the browser drops it back to the document body.
		tick().then(() => resolvedRef?.focus());
	}
</script>

<div
	bind:this={ref}
	class={cn(
		"ft-rec border-border w-full rounded-lg border p-4 text-sm",
		isOpen && "bg-card/50",
		className
	)}
	role="group"
	aria-label={title}
	data-state={current}
>
	<div class="flex items-start gap-3">
		<div class="min-w-0 flex-1">
			{#if badge}
				<p class="ft-rec-badge text-muted-foreground mb-1 text-[0.6875rem] font-medium uppercase">
					{badge}
				</p>
			{/if}
			<p class="ft-rec-title text-foreground font-medium">{title}</p>
			{#if description}
				<p class="ft-rec-description text-muted-foreground mt-0.5 text-xs leading-relaxed">
					{description}
				</p>
			{/if}
		</div>

		{#if hasConfidence}
			<!--
				One label for the pair: the counter is mid-animation for most of its
				life and the ring says nothing out loud, so assistive tech is given the
				settled figure once and both halves are hidden behind it.
			-->
			<div
				class="ft-rec-confidence flex flex-none items-center gap-2"
				role="img"
				aria-label="Confidence {percent}%"
				data-band={band}
			>
				<span
					class="ft-rec-percent text-foreground text-xs font-medium tabular-nums"
					aria-hidden="true"
				>
					<NumberTicker
						value={percent}
						duration={tickerMs}
						class="text-inherit dark:text-inherit"
					/>%
				</span>

				<svg class="ft-rec-ring" viewBox="0 0 32 32" aria-hidden="true">
					<circle
						class="ft-rec-ring-track"
						cx="16"
						cy="16"
						r={RING_R}
						fill="none"
						stroke-width="3"
					/>
					<circle
						class="ft-rec-ring-value"
						class:ft-status-done={band === "done"}
						class:ft-status-running={band === "running"}
						class:ft-status-pending={band === "pending"}
						cx="16"
						cy="16"
						r={RING_R}
						fill="none"
						stroke-width="3"
						stroke-linecap="round"
						stroke-dasharray={RING_C}
						stroke-dashoffset={ringOffset}
						transform="rotate(-90 16 16)"
					/>
				</svg>
			</div>
		{/if}
	</div>

	{#if children}
		<div class="ft-rec-detail mt-3 min-w-0">
			{@render children()}
		</div>
	{/if}

	<!--
		One footer element, mounted from the first render, so the live region exists
		before the outcome lands in it — a region that appears at the same moment as
		its own text is routinely missed by screen readers.
	-->
	<div class="ft-rec-foot mt-3" aria-live="polite">
		{#if isOpen}
			<div class="ft-rec-actions flex flex-wrap items-center justify-end gap-2">
				<button
					type="button"
					class="ft-rec-dismiss text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
					onclick={() => decide("dismissed")}
				>
					{dismissLabel}
				</button>
				<button
					type="button"
					class="ft-rec-accept bg-foreground text-background hover:bg-foreground/90 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
					onclick={() => decide("accepted")}
				>
					{acceptLabel}
				</button>
			</div>
		{:else}
			<p
				bind:this={resolvedRef}
				tabindex="-1"
				class="ft-rec-resolved focus-visible:ring-ring flex items-center gap-1.5 rounded-md text-xs font-medium focus-visible:ring-1 focus-visible:outline-none"
				class:ft-accepted={current === "accepted"}
			>
				<span class="flex-none" aria-hidden="true">
					<svg
						class="size-3.5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						{#if current === "accepted"}
							<path d="m20 6-11 11-5-5" />
						{:else}
							<path d="M18 6 6 18" />
							<path d="m6 6 12 12" />
						{/if}
					</svg>
				</span>
				{resolvedLabel}
			</p>
		{/if}
	</div>
</div>

<style>
	/*
	 * Every colour is read at the point of use through two hooks: this card's own
	 * `--ft-rec-*`, then the `--ft-status-*` vocabulary the whole AI family shares,
	 * then the literal. Setting either anywhere up the tree retints the card
	 * without having to win a specificity fight against these scoped rules, and
	 * the shared one recolours every sibling component at once.
	 */
	.ft-rec-badge {
		letter-spacing: 0.08em;
	}

	.ft-rec-ring {
		width: var(--ft-rec-ring-size, 1.75rem);
		height: var(--ft-rec-ring-size, 1.75rem);
	}

	.ft-rec-ring-track {
		stroke: var(--ft-rec-track, color-mix(in oklab, currentColor 15%, transparent));
	}

	/*
	 * The band is carried by the arc's length as much as by its hue — a quarter
	 * ring and a full ring are told apart without seeing colour at all, and the
	 * figure beside it says the number in words either way.
	 */
	.ft-rec-ring-value.ft-status-done {
		stroke: var(
			--ft-rec-high,
			var(--ft-status-done, light-dark(oklch(0.5 0.14 145), oklch(0.72 0.15 145)))
		);
	}

	.ft-rec-ring-value.ft-status-running {
		stroke: var(
			--ft-rec-medium,
			var(--ft-status-running, light-dark(oklch(0.5 0.18 265), oklch(0.72 0.15 265)))
		);
	}

	.ft-rec-ring-value.ft-status-pending {
		stroke: var(
			--ft-rec-low,
			var(--ft-status-pending, light-dark(oklch(0.5 0.02 260), oklch(0.72 0.02 260)))
		);
	}

	/* A dismissal is not a failure, so it stays deliberately quiet. */
	.ft-rec-resolved {
		color: var(--ft-rec-dismissed, color-mix(in oklab, currentColor 65%, transparent));
	}

	.ft-rec-resolved.ft-accepted {
		color: var(
			--ft-rec-accepted,
			var(--ft-status-done, light-dark(oklch(0.5 0.14 145), oklch(0.72 0.15 145)))
		);
	}

	/*
	 * Both moving parts live behind the query, so reduced motion is not a degraded
	 * variant to keep in sync: the ring is drawn at its final length and the
	 * footer simply swaps, with the same colours and the same words. The counter
	 * is JS-driven and collapses its own duration alongside.
	 */
	@media (prefers-reduced-motion: no-preference) {
		.ft-rec-ring-value {
			transition: stroke-dashoffset 700ms cubic-bezier(0.4, 0, 0.2, 1);
		}

		.ft-rec-resolved {
			animation: ft-rec-resolve-in 240ms cubic-bezier(0.4, 0, 0.2, 1);
		}
	}

	@keyframes ft-rec-resolve-in {
		from {
			opacity: 0;
			transform: translateY(-3px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
</style>
