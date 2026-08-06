<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface PromptSuggestionsProps {
		/** Prompt texts offered to the user, in display order */
		suggestions: string[];
		/** Called with the chosen prompt and its index when a pill is activated */
		onSelect?: (suggestion: string, index: number) => void;
		/** Whether the pills are shown; flipping this to true replays the entrance */
		visible?: boolean;
		/** Delay between two consecutive pills entering, in milliseconds */
		staggerMs?: number;
		/** Accessible name of the group wrapping the pills */
		label?: string;
		/** Custom pill content, receiving the suggestion and its index */
		item?: Snippet<[string, number]>;
		/** Additional CSS classes */
		class?: string;
		/** Element reference */
		ref?: HTMLDivElement | null;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let {
		suggestions,
		onSelect,
		visible = true,
		staggerMs = 60,
		label = "Suggestions",
		item,
		class: className,
		ref = $bindable(null),
	}: PromptSuggestionsProps = $props();

	/** Past this the last pill of a long row would still be waiting long after the reply landed. */
	const MAX_STAGGER_MS = 400;

	// A negative stagger would drop later pills in mid-entrance rather than
	// delaying them, which reads as a glitch instead of a cascade.
	const stagger = $derived(Math.min(Math.max(staggerMs, 0), MAX_STAGGER_MS));

	// Recreating the pills is what restarts their CSS animation, so the keyed
	// {#each} hangs off a counter that only moves when `visible` flips false →
	// true. The effect reads `visible` and writes `generation` — never the other
	// way round; the counter's source and the previous value are plain locals so
	// nothing it touches can schedule it again.
	let generation = $state(0);
	let generationSource = 0;
	let wasVisible: boolean | null = null;

	// Pre-flush, so the re-key and the unhiding land in the same DOM update: a
	// post-flush bump would show the previous pills for a frame at full opacity
	// before replacing them with ones animating up from zero.
	$effect.pre(() => {
		const isVisible = visible;
		// The first run only adopts the mounted value — a component that starts
		// out visible has not transitioned, and re-keying it would throw away the
		// pills the browser is already animating.
		if (wasVisible !== null && isVisible && !wasVisible) {
			generationSource += 1;
			generation = generationSource;
		}
		wasVisible = isVisible;
	});

	const rootStyle = $derived(
		`--ft-suggestions-stagger:${stagger}ms${visible ? "" : ";display:none"}`
	);
</script>

<div
	bind:this={ref}
	class={cn("flex flex-wrap items-center gap-2", className)}
	style={rootStyle}
	role="group"
	aria-label={label}
>
	{#each suggestions as suggestion, i (`${generation}:${i}`)}
		<button
			type="button"
			class="ft-suggestion border-border text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground focus-visible:ring-ring cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
			style="--ft-suggestions-delay:calc(var(--ft-suggestions-stagger) * {i})"
			onclick={() => onSelect?.(suggestion, i)}
		>
			{#if item}{@render item(suggestion, i)}{:else}{suggestion}{/if}
		</button>
	{/each}
</div>

<style>
	@media (prefers-reduced-motion: no-preference) {
		.ft-suggestion {
			/*
			 * `backwards` holds the pill at the keyframe's starting opacity through
			 * its delay. Without it every pill would paint fully opaque first and
			 * then drop out to fade back in, one at a time.
			 */
			animation: ft-suggestions-enter var(--ft-suggestions-duration, 220ms) ease-out backwards;
			animation-delay: var(--ft-suggestions-delay, 0ms);
		}

		@keyframes ft-suggestions-enter {
			from {
				opacity: 0;
				transform: translateY(4px);
			}
			to {
				opacity: 1;
				transform: none;
			}
		}
	}

	/*
	 * Reduced motion leaves the pills exactly where they land. The entrance is the
	 * only motion in the component, so there is nothing here to override.
	 */
</style>
