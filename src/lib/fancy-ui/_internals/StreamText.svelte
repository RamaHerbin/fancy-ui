<script lang="ts" module>
	/**
	 * Props for StreamText
	 */
	export interface StreamTextProps {
		/** The whole text so far. Hand over a longer string to stream more in. */
		text: string;
		/** How long a newly arrived chunk stays tinted, in ms. */
		settleMs?: number;
		/** Additional CSS classes */
		class?: string;
	}
</script>

<script lang="ts">
	import { onDestroy, untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import { createTextStream } from "./stream-text.svelte.js";

	let { text, settleMs = 350, class: className }: StreamTextProps = $props();

	// Built once, with the initial text already settled: the server renders the
	// whole string as a single plain span and only later growth animates. Reading
	// the text here is meant to capture its first value, hence the untrack —
	// `settleMs` goes in as a getter so a later duration reaches later chunks
	// instead of leaving them on the mount-time timeout the CSS no longer matches.
	const stream = untrack(() => createTextStream(text, { settleMs: () => settleMs }));

	// The first run pushes the text the stream was built from, which is a no-op.
	$effect(() => {
		stream.push(text);
	});

	onDestroy(() => stream.destroy());
</script>

<span class={cn("ft-stream", className)} style="white-space: pre-wrap; --ft-settle: {settleMs}ms"
	>{#each stream.segments as segment (segment.id)}<span class:ft-fresh={segment.fresh}
			>{segment.text}</span
		>{/each}</span
>

<style>
	/*
	 * Reduced motion gets plain text at its final colour: with the whole rule
	 * behind the query there is no animation to shorten or fall back from.
	 */
	@media (prefers-reduced-motion: no-preference) {
		.ft-fresh {
			animation: ft-tint var(--ft-settle, 350ms) ease-out;
		}

		@keyframes ft-tint {
			from {
				color: var(--ft-tint-color, oklch(0.65 0.15 250));
				opacity: 0.6;
			}
			to {
				color: inherit;
				opacity: 1;
			}
		}
	}
</style>
