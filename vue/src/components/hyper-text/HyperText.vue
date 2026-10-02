<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * HyperText - Character scramble effect
 *
 * Displays text that scrambles through random characters on hover (or on load),
 * then resolves back to the original text. Each character is individually animated
 * with a staggered reveal.
 */
export interface HyperTextProps {
	/** Text to display and scramble */
	text: string;
	/** Total animation duration in ms */
	duration?: number;
	/** Whether to animate on initial load */
	animateOnLoad?: boolean;
	/**
	 * Seed for the scramble-character stream. The same seed always produces the
	 * same scramble sequence, which makes the effect reproducible in a test and
	 * identical across mounts. Not part of the reference API: it replaces a bare
	 * `Math.random()` call so the animation stays render-safe (divergence).
	 */
	seed?: number;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { cn } from "../../utils.js";

defineOptions({ name: "HyperText", inheritAttrs: false });

const {
	text,
	duration = 800,
	animateOnLoad = false,
	seed = 1,
	class: className,
} = defineProps<HyperTextProps>();

const ALPHABETS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * mulberry32 — a tiny deterministic PRNG, standing in for the source's bare
 * `Math.random()`. Seeding costs nothing visually (the same uniform
 * distribution) and buys a scramble that can be asserted on in a test.
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

const displayChars = computed(() => text.split(""));
// Seeded with the full text rather than the source's empty array: the source
// fills it from a post-mount effect, so its server render and first client
// frame emit no characters at all. Filling it in setup keeps the two frames
// identical and matches the sibling port (divergence).
const displayText = ref<string[]>(displayChars.value);
let intervalId: ReturnType<typeof setInterval> | null = null;
let iterations = 0;

// Sync displayText when text prop changes
watch(
	displayChars,
	(next) => {
		displayText.value = next;
	},
	{ flush: "post" },
);

function getRandomLetter(random: () => number): string {
	return ALPHABETS[Math.floor(random() * ALPHABETS.length)] ?? "A";
}

function stopAnimation() {
	if (intervalId) {
		clearInterval(intervalId);
		intervalId = null;
	}
}

function startAnimation() {
	stopAnimation();
	iterations = 0;
	const intervalMs = duration / (text.length * 10);
	const random = mulberry32(seed);

	intervalId = setInterval(() => {
		// `text` is a reactive destructure, so every read below hits the current
		// prop — as the source's interval handler does. A text change mid-flight
		// therefore resolves toward the new string, not a stale snapshot.
		const target = text;
		if (iterations < target.length) {
			displayText.value = displayText.value.map((l, i) =>
				l === " " ? l : i <= iterations ? (target[i] ?? l) : getRandomLetter(random),
			);
			iterations += 0.1;
		} else {
			stopAnimation();
			displayText.value = target.split("");
		}
	}, intervalMs);
}

function triggerAnimation() {
	iterations = 0;
	startAnimation();
}

onMounted(() => {
	if (animateOnLoad) {
		triggerAnimation();
	}
});

onBeforeUnmount(stopAnimation);
</script>

<template>
	<div
		:class="cn('hyper-text flex scale-100 cursor-default overflow-hidden py-2', className)"
		@mouseenter="triggerAnimation"
		role="presentation"
	>
		<div class="flex">
			<span
				v-for="(letter, i) in displayText"
				:key="i"
				:class="cn('hyper-text-char inline-block font-mono', letter === ' ' ? 'w-3' : '')"
				:style="{
					animation: 'hyperFadeIn 0.3s ease forwards',
					animationDelay: `${i * (duration / (text.length * 10))}ms`,
					opacity: 0,
				}"
			>
				{{ letter.toUpperCase() }}
			</span>
		</div>
	</div>
</template>

<style>
@keyframes hyperFadeIn {
	0% {
		opacity: 0;
		transform: translateY(-10px);
	}
	100% {
		opacity: 1;
		transform: translateY(0);
	}
}
</style>
