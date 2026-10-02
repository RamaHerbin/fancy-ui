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
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from "vue";
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
const isInView = ref(false);

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
	"--blur-reveal-delay": `${delay}s`,
	"--blur-reveal-blur": blur,
	"--blur-reveal-y": `${yOffset}px`,
}));
</script>

<template>
	<div ref="containerRef" :class="cn(className)" :style="style">
		<div
			v-if="$slots.default"
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

/* Stagger delays for direct children */
.blur-reveal-wrapper.is-visible > :deep(:nth-child(1)) {
	transition-delay: calc(var(--blur-reveal-delay, 0.2s) * 0);
}
.blur-reveal-wrapper.is-visible > :deep(:nth-child(2)) {
	transition-delay: calc(var(--blur-reveal-delay, 0.2s) * 1);
}
.blur-reveal-wrapper.is-visible > :deep(:nth-child(3)) {
	transition-delay: calc(var(--blur-reveal-delay, 0.2s) * 2);
}
.blur-reveal-wrapper.is-visible > :deep(:nth-child(4)) {
	transition-delay: calc(var(--blur-reveal-delay, 0.2s) * 3);
}
.blur-reveal-wrapper.is-visible > :deep(:nth-child(5)) {
	transition-delay: calc(var(--blur-reveal-delay, 0.2s) * 4);
}
.blur-reveal-wrapper.is-visible > :deep(:nth-child(6)) {
	transition-delay: calc(var(--blur-reveal-delay, 0.2s) * 5);
}
.blur-reveal-wrapper.is-visible > :deep(:nth-child(7)) {
	transition-delay: calc(var(--blur-reveal-delay, 0.2s) * 6);
}
.blur-reveal-wrapper.is-visible > :deep(:nth-child(8)) {
	transition-delay: calc(var(--blur-reveal-delay, 0.2s) * 7);
}
.blur-reveal-wrapper.is-visible > :deep(:nth-child(9)) {
	transition-delay: calc(var(--blur-reveal-delay, 0.2s) * 8);
}
.blur-reveal-wrapper.is-visible > :deep(:nth-child(10)) {
	transition-delay: calc(var(--blur-reveal-delay, 0.2s) * 9);
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

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
	.blur-reveal-wrapper > :deep(*) {
		transition-duration: 0.1s !important;
		transition-delay: 0s !important;
	}
}
</style>
