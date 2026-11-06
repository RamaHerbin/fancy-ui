<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface BlurRevealProps {
	/** Animation duration in seconds */
	duration?: number;
	/** Stagger delay between children in seconds */
	delay?: number;
	/** Initial blur amount (CSS value) */
	blur?: string;
	/** Initial vertical offset in pixels */
	yOffset?: number;
	/** Additional CSS classes for the container */
	class?: HTMLAttributes["class"];
	/** Reveal style: "blur" softens in with blur/translate, "hard" snaps opacity with no easing */
	mode?: "blur" | "hard";
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
import { staggerCap, staggerDelay } from "../../internals/motion/stagger.js";
import { cn } from "../../utils.js";

defineOptions({ name: "BlurReveal", inheritAttrs: false });

const {
	duration = 1,
	delay = 0.2,
	blur = "20px",
	yOffset = 20,
	class: className,
	mode = "blur",
} = defineProps<BlurRevealProps>();

defineSlots<{
	default?: () => unknown;
}>();

const containerRef = useTemplateRef<HTMLDivElement>("containerRef");
const wrapperRef = useTemplateRef<HTMLDivElement>("wrapperRef");
const isInView = ref(false);

// A stagger is N copies of one entrance offset in time: the parent writes
// each child's delay (capped by item size) and re-indexes when the child
// list changes.
let staggerObserver: MutationObserver | undefined;

function applyStagger(root: HTMLElement, stepMs: number) {
	const kids = Array.from(root.children).filter(
		(el): el is HTMLElement | SVGElement => el instanceof HTMLElement || el instanceof SVGElement
	);
	const cap = staggerCap(kids[0]?.getBoundingClientRect().height ?? 0);
	for (const [i, kid] of kids.entries()) {
		const ms = staggerDelay(i, kids.length, stepMs, "first", cap);
		kid.style.setProperty("--ft-child-delay", `${ms}ms`);
	}
}

function stopStagger() {
	staggerObserver?.disconnect();
	staggerObserver = undefined;
	const root = wrapperRef.value;
	if (!root) return;
	for (const el of Array.from(root.children)) {
		if (el instanceof HTMLElement || el instanceof SVGElement) {
			el.style.removeProperty("--ft-child-delay");
		}
	}
}

function startStagger() {
	stopStagger();
	const root = wrapperRef.value;
	if (!root) return;
	const stepMs = delay * 1000;
	applyStagger(root, stepMs);
	staggerObserver = new MutationObserver(() => applyStagger(root, stepMs));
	staggerObserver.observe(root, { childList: true });
}

onMounted(startStagger);
watch([wrapperRef, () => delay], startStagger, { flush: "post" });
onBeforeUnmount(stopStagger);

onMounted(() => {
	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					isInView.value = true;
					observer.disconnect();
				}
			}
		},
		{ threshold: 0.1 }
	);

	observer.observe(containerRef.value!);

	onBeforeUnmount(() => observer.disconnect());
});

const style = computed(() => ({
	"--blur-reveal-duration": `${duration}s`,
	"--blur-reveal-blur": blur,
	"--blur-reveal-y": `${yOffset}px`,
}));
</script>

<template>
	<div ref="containerRef" :class="cn(className)" :style="style">
		<div
			v-if="$slots.default"
			ref="wrapperRef"
			class="blur-reveal-wrapper"
			:class="{ 'is-visible': isInView, 'mode-hard': mode === 'hard' }"
		>
			<slot />
		</div>
	</div>
</template>

<style scoped>
.blur-reveal-wrapper > :deep(*) {
	opacity: 0;
	filter: blur(var(--blur-reveal-blur, 20px));
	transform: translateY(var(--blur-reveal-y, 20px));
	/* off-token: prop-driven seconds */
	transition:
		opacity var(--blur-reveal-duration, 1s) ease-in-out,
		filter var(--blur-reveal-duration, 1s) ease-in-out,
		transform var(--blur-reveal-duration, 1s) ease-in-out;
}

.blur-reveal-wrapper.is-visible > :deep(*) {
	opacity: 1;
	filter: blur(0px);
	transform: translateY(0);
}

/* Hard mode: no blur/translate softening, opacity snaps in via a stepped timing function */
.blur-reveal-wrapper.mode-hard > :deep(*) {
	opacity: 0;
	filter: none;
	transform: none;
	transition: opacity var(--blur-reveal-duration, 1s) steps(2, jump-none);
}

.blur-reveal-wrapper.mode-hard.is-visible > :deep(*) {
	opacity: 1;
}

/* Per-child delay, written by the component (staggerDelay + staggerCap). Placed after
   the hard-mode shorthand, which resets transition-delay. */
.blur-reveal-wrapper.is-visible > :deep(*) {
	transition-delay: var(--ft-child-delay, 0ms);
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
	.blur-reveal-wrapper > :deep(*) {
		/* off-token: reduced-motion collapse */
		transition-duration: 0.1s !important;
		transition-delay: 0s !important;
	}
}
</style>
