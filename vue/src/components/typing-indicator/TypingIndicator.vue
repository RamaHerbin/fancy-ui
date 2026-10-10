<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface TypingIndicatorProps {
	/** Dot diameter in pixels */
	size?: number;
	/** Dot color; any CSS color or custom property expression */
	color?: string;
	/** Duration of one full animation cycle in seconds */
	speed?: number;
	/** Visually hidden text announced to assistive technology */
	label?: string;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { cn } from "../../utils.js";

defineOptions({ name: "TypingIndicator", inheritAttrs: false });

const {
	size = 6,
	color = "var(--ft-typing-color, currentColor)",
	speed = 1.2,
	label = "Typing",
	class: className,
} = defineProps<TypingIndicatorProps>();

const el = useTemplateRef<HTMLDivElement>("el");
defineExpose({ ref: el });

// A zero or negative animation-duration invalidates the whole declaration.
const cycle = computed(() => Math.max(0.01, speed));

// `color` already resolves the public `--ft-typing-color`, so the dots read the
// outcome under a separate name — a custom property may not reference itself.
const rootStyle = computed(() =>
	[
		`--ft-typing-size:${size}px`,
		`--ft-typing-color-resolved:${color}`,
		`--ft-typing-speed:${cycle.value}s`,
		"gap:calc(var(--ft-typing-size) * 0.6)",
	].join(";")
);

// Each dot lags the previous one by a sixth of the cycle, so the wave reads
// as a single gesture rather than three independent blinks.
const dotStyles = computed(() =>
	[0, 1, 2].map((i) => `animation-delay:${Number(((i * cycle.value) / 6).toFixed(4))}s`)
);
</script>

<template>
	<div ref="el" :class="cn('inline-flex items-center', className)" :style="rootStyle" role="status" aria-live="polite">
		<span v-for="(dotStyle, i) in dotStyles" :key="i" class="ft-dot" :style="dotStyle" aria-hidden="true"></span>
		<span class="sr-only">{{ label }}</span>
	</div>
</template>

<style scoped>
.ft-dot {
	display: block;
	width: var(--ft-typing-size);
	height: var(--ft-typing-size);
	border-radius: 9999px;
	background-color: var(--ft-typing-color-resolved);
	/*
	 * Reduced motion holds the dots here: three static dots still read as
	 * presence. Keeping the wave entirely behind the no-preference query means
	 * there is nothing to override.
	 */
	opacity: 0.5;
}

@media (prefers-reduced-motion: no-preference) {
	.ft-dot {
		animation: ft-typing-pulse var(--ft-typing-speed) ease-in-out infinite;
	}

	@keyframes ft-typing-pulse {
		0%,
		60%,
		100% {
			transform: translateY(0);
			opacity: 0.45;
		}
		30% {
			transform: translateY(-25%);
			opacity: 1;
		}
	}
}
</style>
