<script lang="ts" module>
	import type { HTMLAttributes } from "svelte/elements";

	/**
	 * LetterPullup - Staggered letter pull-up animation
	 *
	 * Each letter of the provided text pulls up from below with a staggered delay,
	 * creating a wave-like entrance effect. Pure CSS animation.
	 */
	export interface LetterPullupOwn {
		/** Text to animate (each character gets its own animation) */
		words: string;
		/** Delay between each letter animation (seconds) */
		delay?: number;
		/** Additional CSS classes */
		class?: string;
	}

	export type LetterPullupProps = LetterPullupOwn &
		Omit<HTMLAttributes<HTMLDivElement>, keyof LetterPullupOwn>;
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let { words, delay = 0.05, class: className, ...restProps }: LetterPullupProps = $props();

	let letters = $derived(words.split(""));
</script>

<div {...restProps} class="letter-pullup flex justify-center">
	{#each letters as letter, index (index)}
		<span
			class={cn(
				"letter-pullup-char inline-block text-center text-4xl font-bold tracking-[-0.02em] text-black drop-shadow-sm md:leading-[5rem] dark:text-white",
				className
			)}
			style:--letter-pullup-delay="{index * delay}s"
		>
			{#if letter === " "}
				&nbsp;
			{:else}
				{letter}
			{/if}
		</span>
	{/each}
</div>

<style>
	:global {
		@keyframes letterPullUp {
			0% {
				opacity: 0;
				transform: translateY(100px);
			}
			100% {
				opacity: 1;
				transform: translateY(0);
			}
		}
	}

	/* Resting state is the ungated default: visible, in place. */
	@media (prefers-reduced-motion: no-preference) {
		.letter-pullup-char {
			opacity: 0;
			transform: translateY(100px);
			animation: letterPullUp 0.5s ease forwards;
			animation-delay: var(--letter-pullup-delay, 0s);
		}
	}
</style>
