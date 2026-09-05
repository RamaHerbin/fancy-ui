<script lang="ts" module>
	import type { Snippet } from "svelte";

	/**
	 * Props for ScrollAnchor
	 */
	export interface ScrollAnchorProps {
		/**
		 * Whether the region pins itself to the bottom as content arrives. Bind it
		 * to whatever says a response is still streaming; `false` leaves an ordinary
		 * scroll box that never moves on its own.
		 */
		active?: boolean;
		/** How close to the bottom (px) still counts as pinned. */
		bottomThreshold?: number;
		/** Label on the floating return button. */
		returnLabel?: string;
		/** Whether the floating return button appears once the reader scrolls away. */
		showReturn?: boolean;
		/** Height cap on the scrolling region — any CSS length. */
		maxHeight?: string;
		/** Called when the region pins itself to the bottom or lets go, never on every scroll. */
		onStickChange?: (stuck: boolean) => void;
		/** The scrolling content */
		children: Snippet;
		/** Additional CSS classes */
		class?: string;
		/** The root element */
		ref?: HTMLDivElement | null;
		/**
		 * Plays the press cue through the sound controller when the
		 * return-to-latest pill is activated. Off by default; only audible
		 * once the user has enabled sound.
		 */
		sound?: boolean;
	}
</script>

<script lang="ts">
	import { untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import { autoscroll, scrollToBottom } from "../_internals/autoscroll.js";
	import { sound as soundFx } from "../sound/sound.svelte.js";

	let {
		active = true,
		bottomThreshold = 40,
		returnLabel = "Jump to latest",
		showReturn = true,
		maxHeight = "100%",
		onStickChange,
		children,
		class: className,
		ref = $bindable(null),
		sound = false,
	}: ScrollAnchorProps = $props();

	let region = $state<HTMLDivElement | null>(null);
	// Content that fits, or a container already at its bottom edge, counts as
	// pinned — the same opening assumption the action makes.
	let stuck = $state(true);

	/**
	 * The action is the one that decides; this only mirrors its answer so the
	 * button can be rendered from it, and passes the same answer on untouched.
	 */
	function handleStick(next: boolean) {
		stuck = next;
		onStickChange?.(next);
	}

	const options = $derived({
		enabled: active,
		bottomThreshold,
		onStickChange: handleStick,
	});

	/*
	 * The button belongs to the pinning behaviour, so it goes when the pinning
	 * does: with `active` false the action has disconnected its scroll listener
	 * and would never be able to tell us the reader had come back down, leaving a
	 * pill on screen that nothing could ever dismiss.
	 */
	const showPill = $derived(showReturn && active && !stuck);

	// The action reads the container once when it is created and then only speaks
	// up on a transition, so a region that mounts already overflowing — a
	// transcript rendered in one go — would otherwise show no way down to the end.
	// Reading the same geometry here keeps the two in step from the first frame.
	// `bottomThreshold` is read outside the untrack on purpose: it changes the
	// answer with nothing having scrolled, so the pill has to be recomputed when
	// it does. `stuck` is only written here, never read, so this cannot re-trigger
	// itself.
	$effect(() => {
		const node = region;
		const threshold = bottomThreshold;
		if (!node) return;
		untrack(() => {
			stuck = node.scrollHeight - node.scrollTop - node.clientHeight <= threshold;
		});
	});

	function prefersReducedMotion(): boolean {
		if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
		return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	}

	function jump() {
		const node = region;
		if (!node) return;
		if (sound) soundFx.play("press");
		// The button is about to unmount under the pointer, which would drop the
		// keyboard back to the document body. Focus goes to the region it just
		// scrolled, so the arrow keys carry on where the button left off.
		node.focus({ preventScroll: true });
		// A journey the reader asked for is worth showing — unless they have asked
		// for no journeys at all, in which case they simply arrive.
		scrollToBottom(node, prefersReducedMotion() ? "instant" : "smooth");
	}
</script>

<!--
	`h-full` so the region's default `max-height: 100%` has something definite to
	resolve against: a percentage against a parent of `height: auto` computes to
	no cap at all. With no bounded ancestor this still resolves to `auto`, so
	nothing changes for a wrapper that was sizing itself.
-->
<div bind:this={ref} class={cn("ft-scrollanchor relative h-full", className)}>
	<!--
		`tabindex="-1"` is there for the return button alone: the region takes focus
		when the button that had it unmounts, and stays out of the tab order the rest
		of the time, so nothing about a consumer's tab sequence changes. The ring is
		drawn inset because the region fills the root edge to edge.
	-->
	<div
		bind:this={region}
		class="ft-scrollanchor-region focus-visible:ring-ring overflow-y-auto overscroll-y-contain rounded-[inherit] focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
		style:max-height={maxHeight}
		tabindex="-1"
		use:autoscroll={options}
	>
		{@render children()}
	</div>

	{#if showPill}
		<button
			type="button"
			class="ft-scrollanchor-return border-border bg-background text-foreground focus-visible:ring-ring cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap shadow-md focus-visible:ring-2 focus-visible:outline-none"
			onclick={jump}
		>
			<svg
				class="size-3.5 flex-none"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
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

<style>
	/*
	 * Centring lives here rather than on a `-translate-x-1/2` utility: the
	 * entrance keyframes below animate `transform`, and a utility writing the
	 * separate `translate` property would compose with it into a double shift.
	 */
	.ft-scrollanchor-return {
		position: absolute;
		bottom: var(--ft-scrollanchor-offset, 0.75rem);
		left: 50%;
		z-index: 10;
		display: flex;
		align-items: center;
		gap: 0.375rem;
		transform: translateX(-50%);
	}

	/*
	 * The only thing that moves. Reduced motion gets the same button in the same
	 * place, simply already there.
	 */
	@media (prefers-reduced-motion: no-preference) {
		.ft-scrollanchor-return {
			animation: ft-scrollanchor-in 180ms cubic-bezier(0.4, 0, 0.2, 1) both;
		}
	}

	@keyframes ft-scrollanchor-in {
		from {
			opacity: 0;
			transform: translate(-50%, 0.375rem);
		}
		to {
			opacity: 1;
			transform: translate(-50%, 0);
		}
	}
</style>
