<script lang="ts">
/**
 * NumberTicker - Animated number counter
 *
 * Animates a number from 0 to `value` (or vice versa) with easing.
 * Triggers when the element enters the viewport via IntersectionObserver.
 * Formatted using Intl.NumberFormat.
 */
export interface NumberTickerProps {
	/** Target number to animate to */
	value?: number;
	/** Animation direction: "up" counts 0→value, "down" counts value→0 */
	direction?: "up" | "down";
	/** Animation duration in ms */
	duration?: number;
	/** Delay before animation starts (ms) */
	delay?: number;
	/** Number of decimal places to display */
	decimalPlaces?: number;
	/** Additional CSS classes */
	class?: import("vue").HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";

defineOptions({ name: "NumberTicker", inheritAttrs: false });

const {
	value = 0,
	direction = "up",
	duration = 1000,
	delay = 0,
	decimalPlaces = 0,
	class: className,
} = defineProps<NumberTickerProps>();

const spanRef = useTemplateRef<HTMLSpanElement>("spanRef");
const initialValue = computed(() => (direction === "down" ? value : 0));
const displayValue = ref(0);
let hasAnimated = false;
let animationFrameId: number | null = null;

// Set initial display value
watch(
	initialValue,
	(v) => {
		if (!hasAnimated) {
			displayValue.value = v;
		}
	},
	{ flush: "post" }
);
displayValue.value = initialValue.value;

// Easing: easeOutCubic
function easeOutCubic(t: number): number {
	return 1 - Math.pow(1 - t, 3);
}

function animate(target: number) {
	// A previous chain may still be scheduling frames; cancel it so two loops
	// never fight over `displayValue` (and so none survives unmount).
	if (animationFrameId !== null) {
		cancelAnimationFrame(animationFrameId);
		animationFrameId = null;
	}

	const start = displayValue.value;
	const startTime = performance.now() + delay;

	function tick(now: number) {
		if (now < startTime) {
			animationFrameId = requestAnimationFrame(tick);
			return;
		}
		const elapsed = now - startTime;
		const progress = Math.min(elapsed / duration, 1);
		const easedProgress = easeOutCubic(progress);

		displayValue.value = start + (target - start) * easedProgress;

		if (progress < 1) {
			animationFrameId = requestAnimationFrame(tick);
		} else {
			animationFrameId = null;
		}
	}

	animationFrameId = requestAnimationFrame(tick);
}

const formattedValue = computed(() =>
	new Intl.NumberFormat("en-US", {
		minimumFractionDigits: decimalPlaces,
		maximumFractionDigits: decimalPlaces,
	}).format(Number(displayValue.value.toFixed(decimalPlaces)))
);

onMounted(() => {
	const observer = new IntersectionObserver(
		(entries) => {
			if (entries[0]?.isIntersecting && !hasAnimated) {
				hasAnimated = true;
				const target = direction === "down" ? 0 : value;
				animate(target);
				observer.disconnect();
			}
		},
		{ threshold: 0 }
	);

	if (spanRef.value) observer.observe(spanRef.value);

	onBeforeUnmount(() => {
		observer.disconnect();
		if (animationFrameId !== null) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
	});
});

// Re-animate when value prop changes after initial animation
const animTarget = computed(() => (direction === "down" ? 0 : value));
watch(
	animTarget,
	(target) => {
		// `animate` reads `displayValue`/`duration`/`delay`; watch's callback body is
		// untracked by construction so the effect depends on `animTarget` alone and a
		// frame writing `displayValue` cannot re-enter and spawn another chain.
		if (hasAnimated) {
			animate(target);
		}
	},
	{ flush: "post" }
);
</script>

<template>
	<span
		ref="spanRef"
		:class="cn('number-ticker inline-block text-black tabular-nums dark:text-white', className)"
	>
		{{ formattedValue }}
	</span>
</template>
