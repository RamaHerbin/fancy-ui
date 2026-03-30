<script lang="ts" module>
	/**
	 * FlipWords - Cycling word animation
	 *
	 * Cycles through an array of words with per-letter fade-in animation.
	 * Each word fades in letter-by-letter, stays visible for `duration` ms,
	 * then scales/blurs out before the next word appears.
	 */
	export interface FlipWordsProps {
		/** Array of words to cycle through */
		words: string[];
		/** Time each word stays visible (ms) */
		duration?: number;
		/** Additional CSS classes */
		class?: string;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { onMount } from "svelte";

	let { words, duration = 3000, class: className }: FlipWordsProps = $props();

	let currentIndex = $state(0);
	let isExiting = $state(false);
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	let currentWord = $derived(words[currentIndex] ?? "");
	let splitWords = $derived(
		currentWord.split(" ").map((word) => ({
			word,
			letters: word.split(""),
		}))
	);

	function startAnimation() {
		isExiting = true;

		setTimeout(() => {
			isExiting = false;
			currentIndex = (currentIndex + 1) % words.length;
		}, 600);
	}

	function scheduleNext() {
		if (timeoutId) clearTimeout(timeoutId);
		timeoutId = setTimeout(startAnimation, duration);
	}

	$effect(() => {
		// Re-schedule whenever a new word becomes active (not during exit)
		if (!isExiting) {
			void currentIndex; // track dependency
			scheduleNext();
		}
	});

	onMount(() => {
		return () => {
			if (timeoutId) clearTimeout(timeoutId);
		};
	});
</script>

<div class="flip-words relative inline-block px-2">
	{#key currentIndex}
		<div
			class={cn(
				"relative z-10 inline-block text-left text-neutral-900 dark:text-neutral-100",
				isExiting ? "flip-words-exit" : "flip-words-enter",
				className
			)}
		>
			{#each splitWords as wordObj, wordIndex (wordObj.word + wordIndex)}
				<span
					class="flip-words-word inline-block whitespace-nowrap opacity-0"
					style="animation:flipFadeInWord 0.3s ease forwards;animation-delay:{wordIndex * 0.3}s"
				>
					{#each wordObj.letters as letter, letterIndex (wordObj.word + letterIndex)}
						<span
							class="inline-block opacity-0"
							style="animation:flipFadeInLetter 0.2s ease forwards;animation-delay:{wordIndex *
								0.3 +
								letterIndex * 0.05}s">{letter}</span
						>
					{/each}
					<span class="inline-block">&nbsp;</span>
				</span>
			{/each}
		</div>
	{/key}
</div>

<style>
	:global {
		@keyframes flipFadeInWord {
			0% {
				opacity: 0;
				transform: translateY(10px);
				filter: blur(8px);
			}
			100% {
				opacity: 1;
				transform: translateY(0);
				filter: blur(0);
			}
		}

		@keyframes flipFadeInLetter {
			0% {
				opacity: 0;
				transform: translateY(10px);
				filter: blur(8px);
			}
			100% {
				opacity: 1;
				transform: translateY(0);
				filter: blur(0);
			}
		}

		@keyframes flipEnterWord {
			0% {
				opacity: 0;
				transform: translateY(10px);
			}
			100% {
				opacity: 1;
				transform: translateY(0);
			}
		}

		@keyframes flipExitWord {
			0% {
				opacity: 1;
				transform: translateY(0);
				filter: blur(0);
			}
			100% {
				opacity: 0;
				transform: translateY(-10px);
				filter: blur(8px);
			}
		}
	}

	.flip-words-enter {
		animation: flipEnterWord 0.6s ease-in-out forwards;
	}

	.flip-words-exit {
		animation: flipExitWord 0.6s ease-in-out forwards;
	}
</style>
