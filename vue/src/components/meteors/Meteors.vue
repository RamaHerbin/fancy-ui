<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * Meteors - Animated meteor shower effect
 *
 * Generates N span elements with randomized positions, delays, and durations
 * that animate diagonally across the container.
 */
export interface MeteorsProps {
	/** Number of meteors to render */
	count?: number;
	/** Additional CSS classes applied to each meteor */
	class?: HTMLAttributes["class"];
	/**
	 * Seed for the meteor layout. The same seed always produces the same
	 * shower, which is what keeps a server render and its hydration
	 * identical. Change it to give two showers on one page different
	 * layouts — the default is shared, so two `<Meteors />` with no seed
	 * fall the same way.
	 */
	seed?: number;
}
</script>

<script setup lang="ts">
import { computed } from "vue";
import { cn } from "../../utils.js";

defineOptions({ name: "Meteors", inheritAttrs: false });

const { count = 20, class: className, seed = 1 } = defineProps<MeteorsProps>();

interface Meteor {
	left: string;
	animationDelay: string;
	animationDuration: string;
}

/**
 * mulberry32 — a tiny deterministic PRNG. `Math.random()` cannot be used
 * here: it would run once on the server and again during client hydration
 * and the two renders would disagree on every value. A seed keeps both
 * renders identical while keeping the shower in the server HTML.
 */
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

function createMeteors(meteorCount: number, meteorSeed: number): Meteor[] {
	const random = mulberry32(meteorSeed);
	return Array.from({ length: meteorCount }, () => ({
		left: `${Math.floor(random() * 800 - 400)}px`,
		animationDelay: `${(random() * 0.6 + 0.2).toFixed(2)}s`,
		animationDuration: `${Math.floor(random() * 8 + 2)}s`,
	}));
}

const meteors = computed(() => createMeteors(count, seed));
</script>

<template>
	<span
		v-for="(meteor, i) in meteors"
		:key="i"
		:class="
			cn(
				'meteor pointer-events-none absolute top-0 h-0.5 w-0.5 rounded-full bg-slate-500 opacity-0 shadow-[0_0_0_1px_#ffffff10]',
				'before:absolute before:top-1/2 before:h-px before:w-[50px] before:-translate-y-1/2 before:bg-gradient-to-r before:from-slate-500 before:to-transparent before:content-[\'\']',
				className
			)
		"
		:style="{
			left: meteor.left,
			animationDelay: meteor.animationDelay,
			animationDuration: meteor.animationDuration,
		}"
	></span>
</template>

<style scoped>
@keyframes meteor-fall {
	0% {
		transform: rotate(215deg) translateX(0);
		opacity: 1;
	}
	70% {
		opacity: 1;
	}
	100% {
		transform: rotate(215deg) translateX(-500px);
		opacity: 0;
	}
}

.meteor {
	animation: meteor-fall 5s linear infinite;
}
</style>
