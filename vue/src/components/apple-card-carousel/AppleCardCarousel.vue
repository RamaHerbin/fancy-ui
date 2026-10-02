<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { AppleCardData } from "./AppleCard.vue";
export type { AppleCardData };

export interface AppleCardCarouselProps {
	/** Cards to display in the carousel */
	cards: AppleCardData[];
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
	/**
	 * Plays the matching open/close cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}
</script>

<script setup lang="ts">
import { ref } from "vue";
import { useReducedMotion } from "../../internals/motion/use-media-query.js";
import { cn } from "../../utils.js";
import AppleCard from "./AppleCard.vue";

defineOptions({ name: "AppleCardCarousel", inheritAttrs: false });

const { cards, class: className = "", sound = false } = defineProps<AppleCardCarouselProps>();

const expandedIndex = ref(-1);
// The source detects the preference in `onMount` and listens for `change`;
// this composable does exactly that, from `onMounted` to `onScopeDispose`.
const reducedMotion = useReducedMotion();
</script>

<template>
	<div :class="cn('relative w-full', className)">
		<div
			class="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
		>
			<AppleCard
				v-for="(card, i) in cards"
				:key="i"
				:card="card"
				:index="i"
				:expanded-index="expandedIndex"
				:reduced-motion="reducedMotion"
				:on-expand="(idx: number) => (expandedIndex = idx)"
				:on-collapse="() => (expandedIndex = -1)"
				:sound="sound"
			/>
		</div>
	</div>
</template>
