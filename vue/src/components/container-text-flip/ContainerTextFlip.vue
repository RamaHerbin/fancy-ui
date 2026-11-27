<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface ContainerTextFlipProps {
	/** Words to cycle through */
	words?: string[];
	/** Time between words (ms) */
	interval?: number;
	/** Letter animation duration (ms) */
	animationDuration?: number;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
	/** CSS classes for the text span */
	textClass?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, ref, onMounted, useAttrs, watch } from "vue";
import { cn } from "../../utils.js";
import { useReducedMotion } from "../../internals/motion/use-media-query.js";

defineOptions({ name: "ContainerTextFlip", inheritAttrs: false });

const {
	words = ["better", "modern", "beautiful", "awesome"],
	interval = 3000,
	animationDuration = 700,
	class: className,
	textClass,
} = defineProps<ContainerTextFlipProps>();

const attrs = useAttrs();

const currentWordIndex = ref(0);
const currentWord = computed(() => words[currentWordIndex.value] ?? "");
const letters = computed(() => currentWord.value.split(""));

// Live preference; its query starts from its own `onMounted`, registered before
// ours, so the value is current by the time the watch below first runs.
const reducedMotion = useReducedMotion();

onMounted(() => {
	// Reduced motion keeps the current word: no interval is armed, and a flip
	// back re-arms it. `interval` is read once at arm time, as before.
	watch(
		reducedMotion,
		(reduced, _old, onCleanup) => {
			if (reduced) return;
			const id = setInterval(() => {
				currentWordIndex.value = (currentWordIndex.value + 1) % words.length;
			}, interval);
			onCleanup(() => clearInterval(id));
		},
		{ flush: "post", immediate: true }
	);
});
</script>

<template>
	<p
		v-bind="attrs"
		:class="
			cn(
				'relative inline-block rounded-lg px-4 pt-2 pb-3 text-center text-4xl font-bold text-black md:text-7xl dark:text-white',
				'[background:linear-gradient(to_bottom,#f3f4f6,#e5e7eb)]',
				'shadow-[inset_0_-1px_#d1d5db,inset_0_0_0_1px_#d1d5db,_0_4px_8px_#d1d5db]',
				'dark:[background:linear-gradient(to_bottom,#374151,#1f2937)]',
				'dark:shadow-[inset_0_-1px_#10171e,inset_0_0_0_1px_hsla(205,89%,46%,.24),_0_4px_8px_#00000052]',
				className
			)
		"
	>
		<span :class="cn('inline-block', textClass)">
			<span class="inline-block">
				<span
					v-for="(letter, index) in letters"
					:key="`${currentWord}-${index}`"
					class="text-flip-letter inline-block"
					:style="{
						animationDelay: `${index * 0.02}s`,
						animationDuration: `${animationDuration}ms`,
					}"
					>{{ letter === " " ? " " : letter }}</span
				>
			</span>
		</span>
	</p>
</template>

<style scoped>
/* Resting state is the ungated default: the letters are simply shown. */
@media (prefers-reduced-motion: no-preference) {
	.text-flip-letter {
		animation: text-flip-in ease-in-out forwards;
		opacity: 0;
		filter: blur(10px);
	}
}
</style>

<style>
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
</style>
