<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface TextRevealStarsProps {
	/** Number of star dots */
	starsCount?: number;
	/** CSS classes applied to each star */
	class?: HTMLAttributes["class"];
	/**
	 * Seed for the star layout. The same seed always produces the same field,
	 * which is what keeps a server render and its hydration identical. The
	 * Svelte source scatters stars with `Math.random()` on the render path;
	 * the port derives the layout from a deterministic PRNG keyed on this
	 * seed instead (default: 1). Divergence from the Svelte API.
	 */
	seed?: number;
}
</script>

<script setup lang="ts">
import { computed } from "vue";
import { cn } from "../../utils.js";

defineOptions({ name: "TextRevealStars", inheritAttrs: false });

const { starsCount = 130, class: className = "", seed = 1 } = defineProps<TextRevealStarsProps>();

interface StarData {
	top: string;
	left: string;
	targetTop: string;
	targetLeft: string;
	opacity: number;
	duration: number;
}

/**
 * mulberry32 — a tiny deterministic PRNG, replacing `Math.random()` so the
 * star field is identical between a server render and its hydration (see
 * `seed` above).
 */
function mulberry32(value: number): () => number {
	let state = value >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

// Generate star data reactively, based on starsCount and seed.
const stars = computed<StarData[]>(() => {
	const random = mulberry32(seed);
	const randomMove = () => random() * 4 - 2;
	return Array.from({ length: starsCount }, () => ({
		top: `calc(${random() * 100}% + ${randomMove()}px)`,
		left: `calc(${random() * 100}% + ${randomMove()}px)`,
		targetTop: `calc(${random() * 100}% + ${randomMove()}px)`,
		targetLeft: `calc(${random() * 100}% + ${randomMove()}px)`,
		opacity: random(),
		duration: random() * 10 + 20,
	}));
});
</script>

<template>
	<div class="absolute inset-0">
		<span
			v-for="(star, i) in stars"
			:key="i"
			:class="cn('star-animate absolute z-[1] inline-block h-0.5 w-0.5 rounded-full bg-white', className)"
			:style="{
				top: star.top,
				left: star.left,
				'--target-top': star.targetTop,
				'--target-left': star.targetLeft,
				'--star-opacity': star.opacity,
				animationDuration: `${star.duration}s`,
			}"
		></span>
	</div>
</template>

<!--
	The keyframe lives in a second, unscoped block: the Svelte source publishes
	it globally (`:global { @keyframes star-drift { … } }`), and Vue's scoped
	compiler would otherwise rename it to `star-drift-<scopeId>`. The name
	`star-drift` is part of the visual contract and is kept identical.
-->
<style>
@keyframes star-drift {
	0% {
		opacity: 0;
		transform: scale(1);
	}
	50% {
		opacity: var(--star-opacity, 0.5);
		transform: scale(1.2);
	}
	100% {
		opacity: 0;
		transform: scale(0);
		top: var(--target-top);
		left: var(--target-left);
	}
}
</style>

<style scoped>
.star-animate {
	animation: star-drift linear infinite;
}
</style>
