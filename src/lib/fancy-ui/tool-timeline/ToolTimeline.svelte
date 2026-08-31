<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { ToolTimelineItemData } from "../_internals/ai-types.js";

	/**
	 * Props for ToolTimeline
	 */
	export interface ToolTimelineProps {
		/** The agent's activity log, oldest first */
		items: ToolTimelineItemData[];
		/** Called when a row is activated; supplying it turns every row into a button */
		onSelect?: (item: ToolTimelineItemData, index: number) => void;
		/** Replaces the built-in row body, keeping the rail and its dot */
		item?: Snippet<[ToolTimelineItemData, number]>;
		/** Tighter rows with the detail line dropped */
		compact?: boolean;
		/** Accessible name for the list */
		label?: string;
		/** Additional CSS classes */
		class?: string;
		/** Element reference */
		ref?: HTMLDivElement | null;
		/**
		 * Plays the matching interface cue through the sound controller. Off by
		 * default; only audible once the user has enabled sound.
		 */
		sound?: boolean;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { sound as soundFx } from "../sound/sound.svelte.js";
	import { formatRelativeTime } from "../_internals/relative-time.js";
	import { createNow } from "../_internals/elapsed.svelte.js";

	let {
		items,
		onSelect,
		item,
		compact = false,
		label = "Activity",
		class: className,
		ref = $bindable(null),
		sound = false,
	}: ToolTimelineProps = $props();

	// A relative label is only recomputed when something makes this component
	// render, so a timeline left mounted across a minute boundary would keep
	// reporting the age its rows had when they first appeared. One shared clock
	// for the whole list costs a single interval, whatever the row count.
	const now = createNow();
	$effect(() => now.start());

	function iso(timestamp: Date | number) {
		const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
		return Number.isFinite(date.getTime()) ? date.toISOString() : "";
	}

	/** A row activation is a fresh gesture every time — an appended entry or the
	 *  shared clock ticking never routes through here, only an actual pick does. */
	function selectEntry(entry: ToolTimelineItemData, index: number) {
		if (sound) soundFx.play("select");
		onSelect?.(entry, index);
	}
</script>

<!--
	`ft-tooltimeline-compact` rides a `class:` directive rather than `cn()` so the
	compiler can see the class is used and keeps its scoped rule.
-->
<div
	bind:this={ref}
	class={cn("ft-tooltimeline w-full text-sm", className)}
	class:ft-tooltimeline-compact={compact}
>
	<ol class="ft-tooltimeline-list" aria-label={label}>
		<!--
			Keyed by id so an appended entry mounts as a fresh node and plays the
			entrance animation on its own, while the rows already on screen keep the
			DOM nodes they had and stay put.
		-->
		{#each items as entry, index (entry.id)}
			<li class="ft-tooltimeline-row">
				<span class="ft-tooltimeline-dot" aria-hidden="true"></span>

				{#snippet body()}
					{#if item}
						{@render item(entry, index)}
					{:else}
						<span class="ft-tooltimeline-text min-w-0 flex-1">
							<span class="flex min-w-0 items-baseline gap-1.5">
								<span class="ft-tooltimeline-verb font-medium">{entry.verb}</span>
								<span
									class="ft-tooltimeline-target truncate font-mono text-[0.8125rem]"
									title={entry.target}>{entry.target}</span
								>
							</span>
							{#if !compact && entry.detail}
								<span class="ft-tooltimeline-detail text-muted-foreground mt-0.5 block truncate"
									>{entry.detail}</span
								>
							{/if}
						</span>

						<span class="ft-tooltimeline-meta flex shrink-0 items-baseline gap-2">
							{#if entry.additions != null}
								<!--
									`role="img"` is what carries the label into the accessibility
									tree: on a bare span an aria-label is ignored, and "+12" on its
									own is announced as a bare number.
								-->
								<span
									class="ft-tooltimeline-additions tabular-nums"
									role="img"
									aria-label="{entry.additions} additions">+{entry.additions}</span
								>
							{/if}
							{#if entry.deletions != null}
								<span
									class="ft-tooltimeline-deletions tabular-nums"
									role="img"
									aria-label="{entry.deletions} deletions">−{entry.deletions}</span
								>
							{/if}
							{#if entry.timestamp != null}
								<time
									class="ft-tooltimeline-time text-muted-foreground tabular-nums"
									datetime={iso(entry.timestamp)}
									title={iso(entry.timestamp)}
									>{formatRelativeTime(entry.timestamp, { now: now.value })}</time
								>
							{/if}
						</span>
					{/if}
				{/snippet}

				{#if onSelect}
					<button
						type="button"
						class="ft-tooltimeline-body hover:bg-muted/60 focus-visible:ring-ring flex w-full cursor-pointer items-baseline gap-3 rounded-md text-left transition-colors focus-visible:ring-1 focus-visible:outline-none"
						onclick={() => selectEntry(entry, index)}
					>
						{@render body()}
					</button>
				{:else}
					<span class="ft-tooltimeline-body flex items-baseline gap-3 rounded-md">
						{@render body()}
					</span>
				{/if}
			</li>
		{/each}
	</ol>
</div>

<style>
	.ft-tooltimeline {
		/* Rail and dot are mixes of currentColor, so one set of values reads
		   correctly in both light and dark themes. The stat colours cannot do that
		   — they are text, and no single token clears 4.5:1 on both white and near
		   black — so they are read at their point of use off the `--ft-status-*`
		   vocabulary this family shares, whose defaults are `light-dark()` pairs. */
		--ft-tooltimeline-rail: color-mix(in oklab, currentColor 16%, transparent);
		--ft-tooltimeline-dot: color-mix(in oklab, currentColor 38%, transparent);
		--ft-tooltimeline-row-pad: 0.375rem;
		--ft-tooltimeline-enter-duration: 320ms;

		/* Geometry shared by the rail, the dot, and the row indent, so moving the
		   rail moves all three together. */
		--ft-tooltimeline-dot-size: 0.5rem;
		--ft-tooltimeline-rail-x: 0.25rem;
	}

	.ft-tooltimeline-compact {
		--ft-tooltimeline-row-pad: 0.125rem;
	}

	.ft-tooltimeline-list {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.ft-tooltimeline-row {
		position: relative;
		/* Leaves room for the rail; the body adds the rest of the text indent. */
		padding-left: 0.875rem;
	}

	/* The connecting line is drawn per row rather than once behind the list, so it
	   stretches with the row it belongs to and needs no height measurement. */
	.ft-tooltimeline-row::before {
		content: "";
		position: absolute;
		top: 0;
		bottom: 0;
		left: calc(var(--ft-tooltimeline-rail-x) - 1px);
		width: 2px;
		background: var(--ft-tooltimeline-rail);
	}

	/* Trim the line at the first and last dot instead of letting it overshoot the
	   list into empty space. */
	.ft-tooltimeline-row:first-child::before {
		top: calc(var(--ft-tooltimeline-row-pad) + 0.625rem);
	}

	.ft-tooltimeline-row:last-child::before {
		bottom: auto;
		height: calc(var(--ft-tooltimeline-row-pad) + 0.625rem);
	}

	.ft-tooltimeline-row:only-child::before {
		display: none;
	}

	.ft-tooltimeline-dot {
		position: absolute;
		/* Aligned to the middle of the first text line: half a 1.25rem line box
		   minus half the dot. */
		top: calc(var(--ft-tooltimeline-row-pad) + 0.375rem);
		left: 0;
		width: var(--ft-tooltimeline-dot-size);
		height: var(--ft-tooltimeline-dot-size);
		border-radius: 9999px;
		background: var(--ft-tooltimeline-dot);
	}

	.ft-tooltimeline-body {
		padding: var(--ft-tooltimeline-row-pad) 0.5rem;
	}

	.ft-tooltimeline-text {
		min-width: 0;
	}

	.ft-tooltimeline-meta {
		margin-left: auto;
	}

	.ft-tooltimeline-additions {
		color: var(
			--ft-tooltimeline-additions,
			var(--ft-status-done, light-dark(oklch(0.5 0.14 145), oklch(0.72 0.15 145)))
		);
	}

	.ft-tooltimeline-deletions {
		color: var(
			--ft-tooltimeline-deletions,
			var(--ft-status-error, light-dark(oklch(0.5 0.19 25), oklch(0.7 0.18 25)))
		);
	}

	/*
	 * The entrance lives entirely inside `no-preference`, so reduced motion is not
	 * a degraded variant to keep in sync: with the rule gone a new row simply
	 * appears at its final position and opacity.
	 */
	@media (prefers-reduced-motion: no-preference) {
		.ft-tooltimeline-row {
			animation: ft-tooltimeline-enter var(--ft-tooltimeline-enter-duration)
				cubic-bezier(0.16, 1, 0.3, 1) both;
		}
	}

	@keyframes ft-tooltimeline-enter {
		from {
			opacity: 0;
			transform: translateY(-0.25rem);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
</style>
