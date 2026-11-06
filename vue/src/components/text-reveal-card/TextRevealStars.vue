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
	driftX: string;
	driftY: string;
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
	return Array.from({ length: starsCount }, () => {
		// Four position draws, kept in this order: start top/left, then the target.
		const topPct = random() * 100;
		const topMove = randomMove();
		const leftPct = random() * 100;
		const leftMove = randomMove();
		const targetTopPct = random() * 100;
		const targetTopMove = randomMove();
		const targetLeftPct = random() * 100;
		const targetLeftMove = randomMove();
		return {
			top: `calc(${topPct}% + ${topMove}px)`,
			left: `calc(${leftPct}% + ${leftMove}px)`,
			// The drift is a transform (compositor) rather than animated top/left.
			// Percent deltas resolve against the size-container wrapper.
			driftX: `calc(${targetLeftPct - leftPct}cqw + ${targetLeftMove - leftMove}px)`,
			driftY: `calc(${targetTopPct - topPct}cqh + ${targetTopMove - topMove}px)`,
			opacity: random(),
			duration: random() * 10 + 20,
		};
	});
});
</script>

<template>
	<div class="absolute inset-0" style="container-type: size">
		<span
			v-for="(star, i) in stars"
			:key="i"
			:class="
				cn('star-animate absolute z-[1] inline-block h-0.5 w-0.5 rounded-full bg-white', className)
			"
			:style="{
				top: star.top,
				left: star.left,
				'--drift-x': star.driftX,
				'--drift-y': star.driftY,
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
		transform: translate(0, 0) scale(1);
	}
	50% {
		opacity: var(--star-opacity, 0.5);
		transform: translate(calc(var(--drift-x) / 2), calc(var(--drift-y) / 2)) scale(1.2);
	}
	100% {
		opacity: 0;
		transform: translate(var(--drift-x), var(--drift-y)) scale(0);
	}
}
</style>

<style scoped>
/* Resting state: a faint fixed star; the drift only runs without a reduce preference. */
.star-animate {
	opacity: var(--star-opacity, 0.5);
}

@media (prefers-reduced-motion: no-preference) {
	.star-animate {
		opacity: 0;
		animation: star-drift linear infinite;
	}
}
</style>
