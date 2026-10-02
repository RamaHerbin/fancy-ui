<script lang="ts">
import type { HTMLAttributes } from "vue";

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
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed } from "vue";
import { cn } from "../../utils.js";

defineOptions({ name: "LetterPullup", inheritAttrs: false });

const { words, delay = 0.05, class: className } = defineProps<LetterPullupProps>();

const letters = computed(() => words.split(""));
</script>

<template>
	<div class="letter-pullup flex justify-center">
		<span
			v-for="(letter, index) in letters"
			:key="index"
			:class="
				cn(
					'letter-pullup-char inline-block text-center text-4xl font-bold tracking-[-0.02em] text-black drop-shadow-sm md:leading-[5rem] dark:text-white',
					className
				)
			"
			:style="`animation:letterPullUp 0.5s ease forwards;animation-delay:${index * delay}s;opacity:0;transform:translateY(100px)`"
			><template v-if="letter === ' '">&nbsp;</template><template v-else>{{ letter }}</template></span
		>
	</div>
</template>

<style>
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
</style>
