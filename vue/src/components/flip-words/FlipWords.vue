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

defineOptions({ name: "FlipWords", inheritAttrs: false });

const EXIT_MS = 600;

const { words, duration = 3000, class: className } = defineProps<FlipWordsProps>();

const currentIndex = ref(0);
const isExiting = ref(false);
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
	() => [currentIndex.value, isExiting.value, words.length, duration] as const,
	([index, exiting, , d]) => {
		if (!exiting) {
			scheduleNext(index, d);
		}
	},
	{ flush: "post" }
);

onMounted(() => {
	if (!isExiting.value) {
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
				class="flip-words-word inline-block whitespace-nowrap opacity-0"
				:style="`animation:flipFadeInWord 0.3s ease forwards;animation-delay:${wordIndex * 0.3}s`"
			>
				<span
					v-for="(letter, letterIndex) in wordObj.letters"
					:key="wordObj.word + letterIndex"
					class="inline-block opacity-0"
					:style="`animation:flipFadeInLetter 0.2s ease forwards;animation-delay:${
						wordIndex * 0.3 + letterIndex * 0.05
					}s`"
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

.flip-words-enter {
	animation: flipEnterWord var(--flip-words-ms) ease-in-out forwards;
}

.flip-words-exit {
	animation: flipExitWord var(--flip-words-ms) ease-in-out forwards;
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
