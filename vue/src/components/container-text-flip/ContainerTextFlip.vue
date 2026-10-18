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
import { computed, ref, onMounted, onBeforeUnmount } from "vue";
import { cn } from "../../utils.js";

defineOptions({ name: "ContainerTextFlip", inheritAttrs: false });

const {
	words = ["better", "modern", "beautiful", "awesome"],
	interval = 3000,
	animationDuration = 700,
	class: className,
	textClass,
} = defineProps<ContainerTextFlipProps>();

const currentWordIndex = ref(0);
const currentWord = computed(() => words[currentWordIndex.value] ?? "");
const letters = computed(() => currentWord.value.split(""));

onMounted(() => {
	const id = setInterval(() => {
		currentWordIndex.value = (currentWordIndex.value + 1) % words.length;
	}, interval);

	onBeforeUnmount(() => clearInterval(id));
});
</script>

<template>
	<p
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
.text-flip-letter {
	animation: text-flip-in ease-in-out forwards;
	opacity: 0;
	filter: blur(10px);
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
