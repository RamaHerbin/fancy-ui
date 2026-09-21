<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * ColourfulText - Per-character color animation
 *
 * Each character is individually animated with shuffled colors.
 * Colors reshuffle every 5 seconds with staggered CSS transitions.
 * Pure CSS implementation (no motion library dependency).
 */
export interface ColourfulTextProps {
	/** Text to animate */
	text: string;
	/** Array of colors to cycle through */
	colors?: string[];
	/** Initial color before animation */
	startColor?: string;
	/** Transition duration in seconds for each character */
	duration?: number;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
	/**
	 * Seed for the color shuffle. The Svelte source shuffles with
	 * `Math.random()` at component init; here the initial shuffle must be
	 * identical between the server render and its hydration, so it draws from
	 * a deterministic stream instead. The same seed always deals the same
	 * initial order — change it to make two instances start differently.
	 *
	 * DIVERGENCE from the Svelte API: an added prop, not present on the
	 * source. See vue/README.md.
	 */
	seed?: number;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { cn } from "../../utils.js";

defineOptions({ name: "ColourfulText", inheritAttrs: false });

const {
	text,
	colors = [
		"rgb(131, 179, 32)",
		"rgb(47, 195, 106)",
		"rgb(42, 169, 210)",
		"rgb(4, 112, 202)",
		"rgb(107, 10, 255)",
		"rgb(183, 0, 218)",
		"rgb(218, 0, 171)",
		"rgb(230, 64, 92)",
		"rgb(232, 98, 63)",
		"rgb(249, 129, 47)",
	],
	startColor = "rgb(255, 255, 255)",
	duration = 0.5,
	class: className,
	seed = 1,
} = defineProps<ColourfulTextProps>();

/**
 * mulberry32 — a tiny deterministic PRNG. `Math.random()` cannot be used for
 * the initial shuffle: it must render identically on the server and on
 * hydration, and the two would disagree on every color otherwise, which
 * production hydration does not patch — the wrong colors would stay on
 * screen. A seed keeps both renders identical.
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

/**
 * Fisher-Yates over the seeded stream.
 *
 * DIVERGENCE from the Svelte source, which shuffles with
 * `[...colors].sort(() => 0.5 - Math.random())`. That comparator is
 * inconsistent, so `Array.prototype.sort` consumes a different number of
 * draws in a different order depending on the engine's sort algorithm.
 * Fisher-Yates consumes `length - 1` draws in a fixed order, so the same seed
 * yields the same permutation on every engine. The dealt order differs
 * slightly from the source's biased shuffle; the visual behaviour (a
 * shuffled palette, reshuffled every 5s) is unchanged.
 */
function shuffleColors(list: string[], random: () => number): string[] {
	const out = [...list];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[out[i], out[j]] = [out[j] as string, out[i] as string];
	}
	return out;
}

const currentColors = ref<string[]>(shuffleColors(colors, mulberry32(seed)));

onMounted(() => {
	// Client-only reshuffles. XORing the seed decorrelates this stream from
	// the initial shuffle's — replaying the same draws on the same array
	// would make the first 5s reshuffle a visual no-op.
	const random = mulberry32(seed ^ 0x9e3779b9);
	const intervalId = setInterval(() => {
		if (document.visibilityState === "visible") {
			currentColors.value = shuffleColors(colors, random);
		}
	}, 5000);

	onBeforeUnmount(() => clearInterval(intervalId));
});

const chars = computed(() => text.split(""));
</script>

<template>
	<span :class="cn('colourful-text inline-flex', className)">
		<span
			v-for="(char, i) in chars"
			:key="i"
			class="colourful-char inline-block"
			:style="`color:${
				currentColors[i % currentColors.length] ?? startColor
			};transition:color ${duration}s ease ${i * 0.05}s,opacity ${duration}s ease ${
				i * 0.05
			}s,transform ${duration}s ease ${i * 0.05}s,filter ${duration}s ease ${i * 0.05}s`"
			>{{ char === " " ? " " : char }}</span
		>
	</span>
</template>
