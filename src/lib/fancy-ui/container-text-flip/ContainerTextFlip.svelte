<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { untrack } from "svelte";
	import { createReducedMotion } from "../_internals/motion/media-query.svelte.js";
	import type { HTMLAttributes } from "svelte/elements";

	interface Own {
		words?: string[];
		interval?: number;
		animationDuration?: number;
		class?: string;
		textClass?: string;
	}

	type Props = Own & Omit<HTMLAttributes<HTMLParagraphElement>, keyof Own>;

	let {
		words = ["better", "modern", "beautiful", "awesome"],
		interval = 3000,
		animationDuration = 700,
		class: className = "",
		textClass = "",
		...restProps
	}: Props = $props();

	let currentWordIndex = $state(0);
	let currentWord = $derived(words[currentWordIndex] ?? "");
	let letters = $derived(currentWord.split(""));

	// Read live: the query is started from an effect, never at construction.
	const reduced = createReducedMotion();
	$effect(() => reduced.start());

	// Reduced motion keeps the current word: no interval is armed, and a flip
	// back re-arms it. `interval` is read once at arm time, as before.
	$effect(() => {
		if (reduced.current) return;
		const id = setInterval(
			() => {
				currentWordIndex = (currentWordIndex + 1) % words.length;
			},
			untrack(() => interval)
		);

		return () => clearInterval(id);
	});
</script>

<p
	{...restProps}
	class={cn(
		"relative inline-block rounded-lg px-4 pt-2 pb-3 text-center text-4xl font-bold text-black md:text-7xl dark:text-white",
		"[background:linear-gradient(to_bottom,#f3f4f6,#e5e7eb)]",
		"shadow-[inset_0_-1px_#d1d5db,inset_0_0_0_1px_#d1d5db,_0_4px_8px_#d1d5db]",
		"dark:[background:linear-gradient(to_bottom,#374151,#1f2937)]",
		"dark:shadow-[inset_0_-1px_#10171e,inset_0_0_0_1px_hsla(205,89%,46%,.24),_0_4px_8px_#00000052]",
		className
	)}
>
	<span class={cn("inline-block", textClass)}>
		<span class="inline-block">
			{#key currentWord}
				{#each letters as letter, index}
					<span
						class="text-flip-letter inline-block"
						style="animation-delay: {index * 0.02}s; animation-duration: {animationDuration}ms;"
						>{letter === " " ? "\u00A0" : letter}</span
					>
				{/each}
			{/key}
		</span>
	</span>
</p>

<style>
	:global {
		@keyframes text-flip-in {
			0% {
				opacity: 0;
				filter: blur(10px);
			}
			100% {
				opacity: 1;
				filter: blur(0px);
			}
		}
	}

	/* Resting state is the ungated default: the letters are simply shown. */
	@media (prefers-reduced-motion: no-preference) {
		.text-flip-letter {
			animation: text-flip-in ease-in-out forwards;
			opacity: 0;
			filter: blur(10px);
		}
	}
</style>
