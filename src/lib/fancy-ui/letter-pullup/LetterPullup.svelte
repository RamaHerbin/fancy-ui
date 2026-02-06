<script lang="ts" module>
	/**
	 * LetterPullup - Staggered letter pull-up animation
	 *
	 * Each letter of the provided text pulls up from below with a staggered delay,
	 * creating a wave-like entrance effect. Pure CSS animation.
	 */
	export interface LetterPullupProps {
		/** Text to animate (each character gets its own animation) */
		words: string;
		/** Delay between each letter animation (seconds) */
		delay?: number;
		/** Additional CSS classes */
		class?: string;
	}
</script>

<script lang="ts">
	import { cn } from '$lib/utils.js';

	let { words, delay = 0.05, class: className }: LetterPullupProps = $props();

	let letters = $derived(words.split(''));
</script>

<div class="letter-pullup flex justify-center">
	{#each letters as letter, index (index)}
		<span
			class={cn(
				'letter-pullup-char inline-block text-center text-4xl font-bold tracking-[-0.02em] text-black dark:text-white drop-shadow-sm md:leading-[5rem]',
				className
			)}
			style="animation:letterPullUp 0.5s ease forwards;animation-delay:{index *
				delay}s;opacity:0;transform:translateY(100px)"
		>
			{#if letter === ' '}
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
</style>
