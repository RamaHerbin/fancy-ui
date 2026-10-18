<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * SparklesText - Text with animated sparkle stars
 *
 * Renders text with SVG sparkle stars overlaid that animate with
 * fade/scale/rotation effects. Sparkles regenerate periodically.
 */
export interface SparklesTextProps {
	/** Text to display */
	text: string;
	/** Number of sparkle stars */
	sparklesCount?: number;
	/** Two colors for sparkle stars */
	colors?: { first: string; second: string };
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
	/**
	 * Seed for the sparkle field. The same seed always produces the same
	 * initial field, which is what keeps a server render and its hydration
	 * identical. Change it to give two fields on one page different layouts —
	 * the default is shared, so two `<SparklesText />` with no seed start
	 * with the same field.
	 */
	seed?: number;
}

interface Sparkle {
	id: string;
	x: string;
	y: string;
	color: string;
	delay: number;
	scale: number;
	lifespan: number;
}

/**
 * mulberry32 — a tiny deterministic PRNG. The source calls `Math.random()`
 * and `Date.now()` on the render path; both are forbidden here because the
 * initial field is built once during setup and must come out identical on
 * the server and during hydration. A seed keeps both renders identical.
 */
function mulberry32(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function generateStar(
	random: () => number,
	colors: { first: string; second: string }
): Sparkle {
	const x = `${random() * 100}%`;
	const y = `${random() * 100}%`;
	const color = random() > 0.5 ? colors.first : colors.second;
	const delay = random() * 2;
	const scale = random() * 1 + 0.3;
	const lifespan = random() * 10 + 5;
	// The source id mixes in `Date.now()` plus a `Math.random()` draw; both
	// are forbidden on a render path, so the id takes another PRNG draw
	// instead — still unique within a field for keying purposes.
	const id = `${x}-${y}-${random()}`;
	return { id, x, y, color, delay, scale, lifespan };
}
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { cn } from "../../utils.js";

defineOptions({ name: "SparklesText", inheritAttrs: false });

const {
	text,
	sparklesCount = 10,
	colors = { first: "#9E7AFF", second: "#FE8BBB" },
	class: className,
	seed = 1,
} = defineProps<SparklesTextProps>();

// Initialized once at setup, like the source's `initializeStars()` call at
// component init — a later `sparklesCount` change does not regenerate the
// field there either. Building the PRNG stream inline keeps this pure, so it
// produces the same field on the server and during hydration.
const initialRandom = mulberry32(seed);
const sparkles = ref<Sparkle[]>(
	Array.from({ length: sparklesCount }, () => generateStar(initialRandom, colors))
);

let intervalId: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
	// Regeneration happens only after mount, so it never has to agree with
	// the server; a second seeded stream keeps it deterministic anyway. It
	// reads the current `colors` prop directly (a fresh closure per prop
	// change is unnecessary since the interval body just closes over the
	// reactive destructure), so a later colour change reaches the next
	// regenerated star without tearing the interval down.
	const random = mulberry32(seed + 1);
	intervalId = setInterval(() => {
		sparkles.value = sparkles.value.map((star) => {
			if (star.lifespan <= 0) {
				return generateStar(random, colors);
			}
			return { ...star, lifespan: star.lifespan - 0.1 };
		});
	}, 100);
});

onBeforeUnmount(() => {
	if (intervalId !== undefined) clearInterval(intervalId);
});
</script>

<template>
	<div :class="cn('sparkles-text text-6xl font-bold', className)">
		<span class="relative inline-block">
			<svg
				v-for="sparkle in sparkles"
				:key="sparkle.id"
				class="sparkles-star pointer-events-none absolute z-20"
				:style="{
					left: sparkle.x,
					top: sparkle.y,
					'--sparkle-scale': `${sparkle.scale}`,
					animation: `sparkleAnim 0.8s ease-in-out ${sparkle.delay}s infinite`,
					transform: 'scale(0) rotate(75deg)',
					opacity: 0,
				}"
				width="21"
				height="21"
				viewBox="0 0 21 21"
			>
				<path
					d="M9.82531 0.843845C10.0553 0.215178 10.9446 0.215178 11.1746 0.843845L11.8618 2.72026C12.4006 4.19229 12.3916 6.39157 13.5 7.5C14.6084 8.60843 16.8077 8.59935 18.2797 9.13822L20.1561 9.82534C20.7858 10.0553 20.7858 10.9447 20.1561 11.1747L18.2797 11.8618C16.8077 12.4007 14.6084 12.3916 13.5 13.5C12.3916 14.6084 12.4006 16.8077 11.8618 18.2798L11.1746 20.1562C10.9446 20.7858 10.0553 20.7858 9.82531 20.1562L9.13819 18.2798C8.59932 16.8077 8.60843 14.6084 7.5 13.5C6.39157 12.3916 4.19225 12.4007 2.72023 11.8618L0.843814 11.1747C0.215148 10.9447 0.215148 10.0553 0.843814 9.82534L2.72023 9.13822C4.19225 8.59935 6.39157 8.60843 7.5 7.5C8.60843 6.39157 8.59932 4.19229 9.13819 2.72026L9.82531 0.843845Z"
					:fill="sparkle.color"
				/>
			</svg>
			{{ text }}
		</span>
	</div>
</template>

<style>
/* The source's only rule is a global keyframe, referenced from the inline
   `style` above. It stays in an unscoped block so the compiler neither
   renames it nor stamps a scope id onto markup the source leaves bare. */
@keyframes sparkleAnim {
	0% {
		opacity: 0;
		transform: scale(0) rotate(75deg);
	}
	50% {
		opacity: 1;
		transform: scale(var(--sparkle-scale, 1)) rotate(120deg);
	}
	100% {
		opacity: 0;
		transform: scale(0) rotate(150deg);
	}
}
</style>
