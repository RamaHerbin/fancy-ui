<script lang="ts" module>
	export interface TextGenerateEffectProps {
		words: string;
		filter?: boolean;
		duration?: number;
		delay?: number;
		stagger?: number;
		class?: string;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { onMount } from "svelte";

	let {
		words,
		filter = true,
		duration = 0.7,
		delay = 0,
		stagger = 200,
		class: className,
	}: TextGenerateEffectProps = $props();

	let wordsArray = $derived(words.split(" "));
	let scopeRef: HTMLDivElement;

	onMount(() => {
		const spans = scopeRef.querySelectorAll<HTMLSpanElement>("span");

		const timeout = setTimeout(() => {
			spans.forEach((span, index) => {
				const wordTimeout = setTimeout(() => {
					span.style.opacity = "1";
					span.style.filter = filter ? "blur(0px)" : "none";
				}, index * stagger);

				// Store timeout ID for cleanup
				(span as HTMLSpanElement & { _tid?: ReturnType<typeof setTimeout> })._tid = wordTimeout;
			});
		}, delay);

		return () => {
			clearTimeout(timeout);
			spans.forEach((span) => {
				const tid = (span as HTMLSpanElement & { _tid?: ReturnType<typeof setTimeout> })._tid;
				if (tid) clearTimeout(tid);
			});
		};
	});
</script>

<div class={cn("text-generate-effect leading-snug tracking-wide", className)}>
	<div bind:this={scopeRef}>
		{#each wordsArray as word, idx (word + idx)}
			<span
				class="tge-word inline-block"
				style:--tge-duration="{duration}s"
				style:--tge-blur={filter ? "blur(10px)" : "none"}
			>
				{word}&nbsp;
			</span>
		{/each}
	</div>
</div>

<style>
	/* The resting state is the ungated default: every word visible and sharp.
	   The hidden start and the fade belong to the no-preference gate; the
	   reveal timers write opacity/filter inline, which wins inside the gate. */
	@media (prefers-reduced-motion: no-preference) {
		.tge-word {
			opacity: 0;
			filter: var(--tge-blur, none);
			transition:
				opacity var(--tge-duration, 0.7s),
				filter var(--tge-duration, 0.7s);
		}
	}
</style>
