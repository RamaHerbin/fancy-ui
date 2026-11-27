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
	import { createReducedMotion } from "../_internals/motion/media-query.svelte.js";

	const EXIT_MS = 600;

	let { words, duration = 3000, class: className }: FlipWordsProps = $props();

	let currentIndex = $state(0);
	let isExiting = $state(false);
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	let exitTimeoutId: ReturnType<typeof setTimeout> | null = null;

	let currentWord = $derived(words[currentIndex] ?? "");
	let splitWords = $derived(
		currentWord.split(" ").map((word) => ({
			word,
			letters: word.split(""),
		}))
	);

	function startAnimation() {
		if (words.length < 2) return;

		isExiting = true;

		if (exitTimeoutId) clearTimeout(exitTimeoutId);
		exitTimeoutId = setTimeout(() => {
			isExiting = false;
			currentIndex = (currentIndex + 1) % words.length;
		}, EXIT_MS);
	}

	function scheduleNext(index: number, d: number) {
		if (words.length < 2) return;
		if (timeoutId) clearTimeout(timeoutId);
		timeoutId = setTimeout(startAnimation, d);
	}

	// Read live: the query is started from an effect, never at construction.
	const reduced = createReducedMotion();
	$effect(() => reduced.start());

	$effect(() => {
		// Reduced motion keeps the current word: nothing is scheduled, and a flip
		// back re-arms the cycle because the effect reads `reduced.current`.
		if (reduced.current) {
			if (timeoutId) clearTimeout(timeoutId);
			timeoutId = null;
			return;
		}
		// Re-schedule whenever a new word becomes active (not during exit).
		// Reference currentIndex and duration directly so the effect re-runs on changes.
		if (!isExiting) {
			scheduleNext(currentIndex, duration);
		}
	});

	onMount(() => {
		return () => {
			if (timeoutId) clearTimeout(timeoutId);
			if (exitTimeoutId) clearTimeout(exitTimeoutId);
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
					class="flip-words-word inline-block whitespace-nowrap"
					style:--flip-words-word-delay="{wordIndex * 0.3}s"
				>
					{#each wordObj.letters as letter, letterIndex (wordObj.word + letterIndex)}
						<span
							class="flip-words-letter inline-block"
							style:--flip-words-letter-delay="{wordIndex * 0.3 + letterIndex * 0.05}s"
							>{letter}</span
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

	.flip-words {
		--flip-words-ms: 0.6s;
	}

	/* Resting state is the ungated default: the current word is visible and in
	   place. The hidden start and every fade/flip belong to this gate. */
	@media (prefers-reduced-motion: no-preference) {
		.flip-words-word {
			opacity: 0;
			animation: flipFadeInWord 0.3s ease forwards;
			animation-delay: var(--flip-words-word-delay, 0s);
		}

		.flip-words-letter {
			opacity: 0;
			animation: flipFadeInLetter 0.2s ease forwards;
			animation-delay: var(--flip-words-letter-delay, 0s);
		}

		.flip-words-enter {
			animation: flipEnterWord var(--flip-words-ms) ease-in-out forwards;
		}

		.flip-words-exit {
			animation: flipExitWord var(--flip-words-ms) ease-in-out forwards;
		}
	}
</style>
