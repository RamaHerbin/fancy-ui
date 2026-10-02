<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface FocusProps {
	/** Sentence to split into words */
	sentence?: string;
	/** Follow the hovered word instead of auto-cycling */
	manualMode?: boolean;
	/** Blur applied to out-of-focus words, in px */
	blurAmount?: number;
	/** Color of the focus frame corners */
	borderColor?: string;
	/** Focus transition duration in seconds */
	animationDuration?: number;
	/** Pause between auto-cycle steps in seconds */
	pauseBetweenAnimations?: number;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";

defineOptions({ name: "Focus", inheritAttrs: false });

const {
	sentence = "Fancy Focus",
	manualMode = false,
	blurAmount = 5,
	borderColor = "green",
	animationDuration = 0.5,
	pauseBetweenAnimations = 1,
	class: className = "",
} = defineProps<FocusProps>();

const words = computed(() => sentence.split(" "));
const containerRef = useTemplateRef<HTMLDivElement>("containerRef");
// Plain array sink, mirroring the Svelte `$state([])` word-element list: it is
// only read imperatively from `updateFocusRect`, never rendered from.
const wordElements = ref<(HTMLSpanElement | null)[]>([]);
const currentIndex = ref(0);
const focusRect = ref({ x: 0, y: 0, width: 0, height: 0 });

function setWordRef(el: Element | null, index: number) {
	wordElements.value[index] = el as HTMLSpanElement | null;
}

function updateFocusRect() {
	const wordEl = wordElements.value[currentIndex.value];
	const container = containerRef.value;
	if (!wordEl || !container) return;
	const parentRect = container.getBoundingClientRect();
	const wordRect = wordEl.getBoundingClientRect();
	focusRect.value = {
		x: wordRect.left - parentRect.left,
		y: wordRect.top - parentRect.top,
		width: wordRect.width,
		height: wordRect.height,
	};
}

function handleMouseEnter(index: number) {
	if (manualMode) {
		currentIndex.value = index;
	}
}

function handleMouseLeave() {
	if (manualMode) {
		currentIndex.value = 0;
	}
}

// Mirrors the Svelte `$effect(() => { currentIndex; tick().then(updateFocusRect); })`:
// tracks currentIndex only, measures on the next tick.
watch(
	currentIndex,
	() => {
		nextTick().then(updateFocusRect);
	},
	{ flush: "post" }
);

let intervalId: ReturnType<typeof setInterval> | undefined;

function stopCycle() {
	if (intervalId !== undefined) clearInterval(intervalId);
	intervalId = undefined;
}

function startCycle() {
	stopCycle();
	// Timing props are read when the cycle starts, as the Svelte `onMount`
	// closure captures them once: a later timing change alone does not restart it.
	const intervalMs = animationDuration * 1000 + pauseBetweenAnimations * 1000;
	intervalId = setInterval(() => {
		currentIndex.value = (currentIndex.value + 1) % words.value.length;
	}, intervalMs);
}

onMounted(() => {
	updateFocusRect();
	if (!manualMode) startCycle();
});

// Toggling `manualMode` after mount starts or stops the auto-cycle, so a manual
// Focus never keeps moving under the pointer and an automatic one always
// cycles. Upstream fix, beyond the Svelte source, whose cycle is mount-only.
watch(
	() => manualMode,
	(manual) => {
		if (manual) {
			stopCycle();
			currentIndex.value = 0;
		} else {
			startCycle();
		}
	}
);

onBeforeUnmount(stopCycle);
</script>

<template>
	<div ref="containerRef" :class="cn('focus-container', className)">
		<span
			v-for="(word, index) in words"
			:key="index"
			:ref="(el) => setWordRef(el as Element | null, index)"
			class="focus-word"
			:class="{ manual: manualMode, active: index === currentIndex && !manualMode }"
			:style="{
				filter: index === currentIndex ? 'blur(0px)' : `blur(${blurAmount}px)`,
				transition: `filter ${animationDuration}s ease`,
				'--border-color': borderColor,
			}"
			@mouseenter="handleMouseEnter(index)"
			@mouseleave="handleMouseLeave"
		>
			{{ word }}
		</span>

		<div
			class="focus-frame"
			:style="{
				transform: `translate(${focusRect.x}px, ${focusRect.y}px)`,
				width: `${focusRect.width}px`,
				height: `${focusRect.height}px`,
				opacity: currentIndex >= 0 ? 1 : 0,
				transition: `all ${animationDuration}s ease`,
				'--border-color': borderColor,
			}"
		>
			<span class="corner top-left"></span>
			<span class="corner top-right"></span>
			<span class="corner bottom-left"></span>
			<span class="corner bottom-right"></span>
		</div>
	</div>
</template>

<style scoped>
.focus-container {
	position: relative;
	display: flex;
	gap: 1em;
	justify-content: center;
	align-items: center;
	flex-wrap: wrap;
}

.focus-word {
	position: relative;
	font-size: 3rem;
	font-weight: 900;
	cursor: pointer;
	transition:
		filter 0.3s ease,
		color 0.3s ease;
}

.focus-word.active {
	filter: blur(0);
}

.focus-frame {
	position: absolute;
	top: 0;
	left: 0;
	pointer-events: none;
	box-sizing: content-box;
	border: none;
}

.corner {
	position: absolute;
	width: 1rem;
	height: 1rem;
	border: 3px solid var(--border-color, #fff);
	filter: drop-shadow(0px 0px 4px var(--border-color, #fff));
	border-radius: 3px;
	transition: none;
}

.top-left {
	top: -10px;
	left: -10px;
	border-right: none;
	border-bottom: none;
}

.top-right {
	top: -10px;
	right: -10px;
	border-left: none;
	border-bottom: none;
}

.bottom-left {
	bottom: -10px;
	left: -10px;
	border-right: none;
	border-top: none;
}

.bottom-right {
	bottom: -10px;
	right: -10px;
	border-left: none;
	border-top: none;
}
</style>
