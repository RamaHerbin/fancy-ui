<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface TracingBeamProps {
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}

function mapRange(
	value: number,
	inMin: number,
	inMax: number,
	outMin: number,
	outMax: number
): number {
	return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from "vue";

import { cn } from "../../utils.js";

defineOptions({ name: "TracingBeam", inheritAttrs: false });

const { class: className = "" } = defineProps<TracingBeamProps>();

const tracingBeamRef = useTemplateRef<HTMLDivElement>("tracingBeamRef");
const contentRef = useTemplateRef<HTMLDivElement>("contentRef");

const svgHeight = ref(0);
const scrollYProgress = ref(0);
const scrollPercentage = ref(0);

// Spring state
const springY1 = ref(0);
const springY2 = ref(0);
let springVelY1 = 0;
let springVelY2 = 0;

const targetY1 = computed(
	() =>
		mapRange(scrollYProgress.value, 0, 0.8, scrollYProgress.value, svgHeight.value) *
		(1.4 - scrollPercentage.value)
);

const targetY2 = computed(
	() =>
		mapRange(scrollYProgress.value, 0, 1, scrollYProgress.value, svgHeight.value - 500) *
		(1.4 - scrollPercentage.value)
);

const circleHasShadow = computed(() => scrollYProgress.value <= 0);
const circleBg = computed(() => (scrollYProgress.value > 0 ? "bg-white" : "bg-emerald-500"));
const circleBorder = computed(() =>
	scrollYProgress.value > 0 ? "border-neutral-300" : "border-emerald-600"
);

const svgPath = computed(
	() => `M 1 0V -36 l 18 24 V ${svgHeight.value * 0.8} l -18 24V ${svgHeight.value}`
);

let rafId = 0;

function updateSpring() {
	const tension = 80;
	const friction = 26;
	const precision = 0.01;

	const forceY1 = tension * (targetY1.value - springY1.value);
	springVelY1 = (springVelY1 + forceY1 * 0.001) * (1 - friction * 0.001);
	springY1.value += springVelY1;

	const forceY2 = tension * (targetY2.value - springY2.value);
	springVelY2 = (springVelY2 + forceY2 * 0.001) * (1 - friction * 0.001);
	springY2.value += springVelY2;

	const settled =
		Math.abs(springVelY1) < precision &&
		Math.abs(targetY1.value - springY1.value) < precision &&
		Math.abs(springVelY2) < precision &&
		Math.abs(targetY2.value - springY2.value) < precision;

	if (!settled) {
		rafId = requestAnimationFrame(updateSpring);
	}
}

function updateScrollProgress() {
	const el = tracingBeamRef.value;
	if (!el) return;
	const rect = el.getBoundingClientRect();
	const windowHeight = window.innerHeight;
	const elementHeight = rect.height;

	scrollPercentage.value = (windowHeight - rect.top) / (windowHeight + elementHeight);
	scrollYProgress.value = (rect.y / windowHeight) * -1;

	cancelAnimationFrame(rafId);
	rafId = requestAnimationFrame(updateSpring);
}

function updateSVGHeight() {
	const el = contentRef.value;
	if (!el) return;
	svgHeight.value = el.offsetHeight;
}

let resizeObserver: ResizeObserver | undefined;

onMounted(() => {
	window.addEventListener("scroll", updateScrollProgress, { passive: true });
	window.addEventListener("resize", updateScrollProgress, { passive: true });
	updateScrollProgress();

	resizeObserver = new ResizeObserver(updateSVGHeight);
	if (contentRef.value) {
		resizeObserver.observe(contentRef.value);
	}
	updateSVGHeight();
});

onBeforeUnmount(() => {
	cancelAnimationFrame(rafId);
	window.removeEventListener("scroll", updateScrollProgress);
	window.removeEventListener("resize", updateScrollProgress);
	resizeObserver?.disconnect();
});
</script>

<template>
	<div ref="tracingBeamRef" :class="cn('relative mx-auto h-full w-full max-w-4xl', className)">
		<div class="absolute top-3 -left-4 md:-left-12">
			<div
				class="ml-[27px] flex size-4 items-center justify-center rounded-full border border-neutral-200 shadow-sm"
				:style="{ boxShadow: circleHasShadow ? 'rgba(0, 0, 0, 0.24) 0px 3px 8px' : 'none' }"
			>
				<div :class="cn('size-2 rounded-full border', circleBg, circleBorder)"></div>
			</div>
			<svg
				:viewBox="`0 0 20 ${svgHeight}`"
				width="20"
				:height="svgHeight"
				class="ml-4 block"
				aria-hidden="true"
			>
				<path :d="svgPath" fill="none" stroke="#9091A0" stroke-opacity="0.16"></path>
				<path
					:d="svgPath"
					fill="none"
					stroke="url(#tracing-beam-gradient)"
					stroke-width="1.25"
					class="motion-reduce:hidden"
				></path>
				<defs>
					<linearGradient
						id="tracing-beam-gradient"
						gradientUnits="userSpaceOnUse"
						x1="0"
						x2="0"
						:y1="springY1"
						:y2="springY2"
					>
						<stop stop-color="#18CCFC" stop-opacity="0"></stop>
						<stop stop-color="#18CCFC"></stop>
						<stop offset="0.325" stop-color="#6344F5"></stop>
						<stop offset="1" stop-color="#AE48FF" stop-opacity="0"></stop>
					</linearGradient>
				</defs>
			</svg>
		</div>
		<div ref="contentRef">
			<slot></slot>
		</div>
	</div>
</template>
