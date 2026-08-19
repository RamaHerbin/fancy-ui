<script lang="ts" module>
	/**
	 * Props for SourcesTrigger
	 */
	export interface SourcesTriggerProps {
		/** Overrides the count line. Defaults to "4 sources", singular at one. */
		label?: string;
		/** Additional CSS classes */
		class?: string;
	}
</script>

<script lang="ts">
	import { getContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import { hostOf, monogram } from "../_internals/host.js";
	import { SOURCES_CONTEXT_KEY, type SourcesContext } from "./types.js";

	let { label, class: className }: SourcesTriggerProps = $props();

	/** How many monograms fit in the stack before it stops meaning anything. */
	const STACK_LIMIT = 3;

	// Undefined when the pill is used outside a Sources root: it then renders an
	// empty, inert count rather than throwing.
	const sources = getContext<SourcesContext | undefined>(SOURCES_CONTEXT_KEY);

	const count = $derived(sources?.count ?? 0);
	const isOpen = $derived(sources?.open.current ?? false);
	const stack = $derived((sources?.sources ?? []).slice(0, STACK_LIMIT));
	const text = $derived(label ?? `${count} ${count === 1 ? "source" : "sources"}`);
</script>

<button
	type="button"
	class={cn(
		"ft-sources-trigger text-muted-foreground hover:text-foreground inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs",
		className
	)}
	aria-expanded={isOpen}
	aria-controls={sources?.listId}
	onclick={() => sources?.toggle()}
>
	{#if stack.length > 0}
		<!-- Decorative: every name in it is spelled out in the list below. -->
		<span class="ft-sources-stack flex flex-none items-center" aria-hidden="true">
			{#each stack as source (source.id)}
				<span class="ft-sources-chip"
					>{monogram(source.domain || hostOf(source.url) || source.title)}</span
				>
			{/each}
		</span>
	{/if}

	<span class="font-medium">{text}</span>

	<svg
		class="ft-sources-chevron size-3 flex-none"
		class:ft-open={isOpen}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2.5"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<path d="m9 6 6 6-6 6" />
	</svg>
</button>

<style>
	.ft-sources-trigger {
		border: 1px solid
			var(
				--ft-sources-card-border,
				var(--color-border, color-mix(in oklab, currentColor 15%, transparent))
			);
		background: var(--ft-sources-trigger-bg, transparent);
	}

	.ft-sources-trigger:hover,
	.ft-sources-trigger:focus-visible {
		background: var(--ft-sources-card-hover-bg, color-mix(in oklab, currentColor 7%, transparent));
	}

	/*
	 * Overlapping monograms read as "a handful of places", which is the whole job
	 * of the collapsed pill. The ring is the surface colour rather than a border,
	 * so the circles cut into each other instead of stacking two outlines.
	 */
	.ft-sources-chip {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1rem;
		height: 1rem;
		border-radius: 9999px;
		box-shadow: 0 0 0 1.5px var(--ft-sources-chip-ring, var(--color-background, canvas));
		background: var(--ft-sources-chip-bg, color-mix(in oklab, currentColor 12%, transparent));
		color: var(--ft-sources-chip-fg, inherit);
		font-size: 0.5rem;
		font-weight: 600;
		line-height: 1;
	}

	.ft-sources-chip:not(:first-child) {
		margin-inline-start: -0.3125rem;
	}

	.ft-sources-chevron.ft-open {
		transform: rotate(90deg);
	}

	@media (prefers-reduced-motion: no-preference) {
		.ft-sources-trigger {
			transition:
				background-color 150ms ease,
				color 150ms ease;
		}

		.ft-sources-chevron {
			transition: transform 220ms cubic-bezier(0.4, 0, 0.2, 1);
		}
	}
</style>
