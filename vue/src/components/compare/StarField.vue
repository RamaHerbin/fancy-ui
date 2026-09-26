<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface StarFieldProps {
	/** Number of stars to render */
	starsCount?: number;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
	/**
	 * Seed for the deterministic star layout. The Svelte source calls
	 * `Math.random()` while building the star list, which runs in the render
	 * path and would disagree between a server render and its hydration. A
	 * seeded PRNG keeps both identical. Divergence from the Svelte API, kept
	 * consistent with the React package's default.
	 */
	seed?: number;
}
</script>

<script setup lang="ts">
import { cn } from "../../utils.js";

defineOptions({ name: "StarField", inheritAttrs: false });

const { starsCount = 130, class: className, seed = 1 } = defineProps<StarFieldProps>();

interface Star {
	id: number;
	top: string;
	left: string;
	size: number;
	twinkleDuration: number;
	driftDuration: number;
	driftDirection: number;
	opacityStart: number;
	opacityEnd: number;
}

/** mulberry32 — deterministic PRNG so SSR and hydration produce the same sky. */
function mulberry32(seedValue: number): () => number {
	let state = seedValue >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function createStars(count: number, seedValue: number): Star[] {
	const rng = mulberry32(seedValue);

	function random(min: number, max: number): number {
		return rng() * (max - min) + min;
	}

	function randomSize(): number {
		return rng() < 0.5 ? 1 : 2;
	}

	return Array.from(
		{ length: count },
		(_, i): Star => ({
			id: i,
			top: `${random(0, 100)}%`,
			left: `${random(0, 100)}%`,
			size: randomSize(),
			twinkleDuration: random(2, 4),
			driftDuration: random(5, 10),
			driftDirection: random(-50, 50),
			opacityStart: random(0.1, 0.3),
			opacityEnd: random(0.7, 1),
		})
	);
}

// Generated once at component creation, exactly as the Svelte source does: a
// later `starsCount` or `seed` change does not rebuild the sky. Reading the
// destructured props here captures their initial values, so the list is a plain
// non-reactive array.
const stars: Star[] = createStars(starsCount, seed);
</script>

<template>
	<div :class="cn('absolute inset-0 overflow-hidden', className)">
		<div
			v-for="star in stars"
			:key="star.id"
			class="star absolute rounded-full bg-white"
			:style="{
				top: star.top,
				left: star.left,
				width: `${star.size}px`,
				height: `${star.size}px`,
				'--fancy-ui-twinkle-duration': `${star.twinkleDuration}s`,
				'--fancy-ui-drift-duration': `${star.driftDuration}s`,
				'--fancy-ui-drift-direction': `${star.driftDirection}px`,
				'--fancy-ui-opacity-start': star.opacityStart,
				'--fancy-ui-opacity-end': star.opacityEnd,
			}"
		></div>
	</div>
</template>

<style scoped>
.star {
	opacity: var(--fancy-ui-opacity-start);
	animation:
		twinkle var(--fancy-ui-twinkle-duration) ease-in-out infinite alternate,
		drift var(--fancy-ui-drift-duration) linear infinite;
}

@keyframes twinkle {
	0% {
		opacity: var(--fancy-ui-opacity-start);
	}
	100% {
		opacity: var(--fancy-ui-opacity-end);
	}
}

@keyframes drift {
	0% {
		transform: translate(0, 0);
	}
	25% {
		transform: translate(
			var(--fancy-ui-drift-direction),
			calc(var(--fancy-ui-drift-direction) / 2)
		);
	}
	50% {
		transform: translate(
			calc(var(--fancy-ui-drift-direction) / 2),
			var(--fancy-ui-drift-direction)
		);
	}
	75% {
		transform: translate(
			calc(var(--fancy-ui-drift-direction) * -1),
			calc(var(--fancy-ui-drift-direction) / 2)
		);
	}
	100% {
		transform: translate(0, 0);
	}
}
</style>
