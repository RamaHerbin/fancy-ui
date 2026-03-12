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

<div class={cn("leading-snug tracking-wide", className)}>
	<div bind:this={scopeRef}>
		{#each wordsArray as word, idx (word + idx)}
			<span
				class="inline-block"
				style="opacity: 0; filter: {filter
					? 'blur(10px)'
					: 'none'}; transition: opacity {duration}s, filter {duration}s;"
			>
				{word}&nbsp;
			</span>
		{/each}
	</div>
</div>
