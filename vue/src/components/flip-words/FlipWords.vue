<script lang="ts">
import type { HTMLAttributes } from "vue";

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
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { cn } from "../../utils.js";
import { useReducedMotion } from "../../internals/motion/use-media-query.js";
import { staggerCap, staggerDelay } from "../../internals/motion/stagger.js";
import { STAGGERS } from "../../internals/motion/tokens.js";

defineOptions({ name: "FlipWords", inheritAttrs: false });

const EXIT_MS = 600;
// off-token: sequence. Words arrive one after another; the order is the content.
const WORD_OFFSET_S = 0.3;
// Glyph-scale items: the shortest cap on the ramp.
const glyphCap = staggerCap(0);

const { words, duration = 3000, class: className } = defineProps<FlipWordsProps>();

const currentIndex = ref(0);
const isExiting = ref(false);

// Live preference; its query starts from its own `onMounted`, registered before
// the first schedule below, so the value is current when that runs.
const reducedMotion = useReducedMotion();
let timeoutId: ReturnType<typeof setTimeout> | null = null;
let exitTimeoutId: ReturnType<typeof setTimeout> | null = null;

const currentWord = computed(() => words[currentIndex.value] ?? "");
const splitWords = computed(() =>
	currentWord.value.split(" ").map((word) => ({
		word,
		letters: word.split(""),
	}))
);

// The template interpolates an explicit `" "` between a word's letters and its
// trailing non-breaking space: the source markup carries a collapsible space
// there, and the template compiler drops the newline-bearing whitespace that
// would otherwise stand in for it. (A comment node in that slot would make the
// compiler keep the surrounding newlines instead, widening the gap.)

function startAnimation() {
	if (words.length < 2) return;

	isExiting.value = true;

	if (exitTimeoutId) clearTimeout(exitTimeoutId);
	exitTimeoutId = setTimeout(() => {
		isExiting.value = false;
		currentIndex.value = (currentIndex.value + 1) % words.length;
	}, EXIT_MS);
}

function scheduleNext(index: number, d: number) {
	if (words.length < 2) return;
	if (timeoutId) clearTimeout(timeoutId);
	timeoutId = setTimeout(startAnimation, d);
}

// Re-schedule whenever a new word becomes active (not during exit).
// `words.length`, never `words` itself: the array is an identity a call site
// like `:words="['Hello', 'World']"` re-allocates on every parent render, and
// keying the schedule on it would clear the pending timeout and re-arm a fresh
// `duration` wait each time, so a parent re-rendering faster than `duration`
// would stop the words flipping altogether. The length is what the `< 2` guard
// reads. The first schedule lives in `onMounted`, not in an `immediate`
// watcher: an immediate callback also runs during a server render, which would
// arm a timer no unmount ever clears.
watch(
	() => [currentIndex.value, isExiting.value, words.length, duration, reducedMotion.value] as const,
	([index, exiting, , d, reduced]) => {
		// Reduced motion keeps the current word: nothing is scheduled, and a flip
		// back re-arms the cycle because the preference is a source of this watch.
		if (reduced) {
			if (timeoutId) clearTimeout(timeoutId);
			timeoutId = null;
			return;
		}
		if (!exiting) {
			scheduleNext(index, d);
		}
	},
	{ flush: "post" }
);

onMounted(() => {
	if (!isExiting.value && !reducedMotion.value) {
		scheduleNext(currentIndex.value, duration);
	}
});

onBeforeUnmount(() => {
	if (timeoutId) clearTimeout(timeoutId);
	if (exitTimeoutId) clearTimeout(exitTimeoutId);
});
</script>

<template>
	<div class="flip-words relative inline-block px-2">
		<div
			:key="currentIndex"
			:class="
				cn(
					'relative z-10 inline-block text-left text-neutral-900 dark:text-neutral-100',
					isExiting ? 'flip-words-exit' : 'flip-words-enter',
					className
				)
			"
		>
			<span
				v-for="(wordObj, wordIndex) in splitWords"
				:key="wordObj.word + wordIndex"
				class="flip-words-word inline-block whitespace-nowrap"
				:style="{ '--flip-words-word-delay': `${wordIndex * WORD_OFFSET_S}s` }"
			>
				<span
					v-for="(letter, letterIndex) in wordObj.letters"
					:key="wordObj.word + letterIndex"
					class="flip-words-letter inline-block"
					:style="{
						'--ft-child-delay': `${staggerDelay(letterIndex, wordObj.letters.length, STAGGERS.item, 'first', glyphCap)}ms`,
					}"
					>{{ letter }}</span
				>{{ " " }}<span class="inline-block">&nbsp;</span>
			</span>
		</div>
	</div>
</template>

<style scoped>
.flip-words {
	--flip-words-ms: 0.6s;
}

/* Resting state is the ungated default: the current word is visible and in
   place. The hidden start and every fade/flip belong to this gate. */
@media (prefers-reduced-motion: no-preference) {
	.flip-words-word {
		opacity: 0;
		animation: flipFadeInWord var(--ft-duration-base, 300ms) ease forwards;
		animation-delay: var(--flip-words-word-delay, 0s);
	}

	.flip-words-letter {
		opacity: 0;
		animation: flipFadeInLetter var(--ft-duration-exit, 200ms) ease forwards;
		/* The word offset is inherited from the parent word; the per-letter stagger is added on top. */
		animation-delay: calc(var(--flip-words-word-delay, 0s) + var(--ft-child-delay, 0ms));
	}

	.flip-words-enter {
		animation: flipEnterWord var(--flip-words-ms) ease-in-out forwards;
	}

	.flip-words-exit {
		animation: flipExitWord var(--flip-words-ms) ease-in-out forwards;
	}
}
</style>

<style>
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
</style>
