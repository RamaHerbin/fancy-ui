<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * AnimatedBeam - an SVG beam that connects two elements.
 *
 * The beam is absolutely positioned over `containerRef`, whose box becomes the
 * svg's coordinate space, and is redrawn whenever that container resizes.
 */
export interface AnimatedBeamProps {
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
	/** The element the beam is drawn inside; its box is the svg's coordinate space. */
	containerRef: HTMLElement | null;
	/** The element the beam starts at. */
	fromRef: HTMLElement | null;
	/** The element the beam ends at. */
	toRef: HTMLElement | null;
	/** Pixels the quadratic control point is lifted above the start, bowing the beam. */
	curvature?: number;
	/** Flips the direction the gradient travels along the path. */
	reverse?: boolean;
	/** Colour of the static track under the beam. */
	pathColor?: string;
	/** Stroke width of both the track and the beam. */
	pathWidth?: number;
	/** Opacity of the static track. */
	pathOpacity?: number;
	/** First gradient stop of the travelling beam. */
	gradientStartColor?: string;
	/** Last gradient stop of the travelling beam. */
	gradientStopColor?: string;
	/**
	 * Seconds the beam waits before its first travel. Feeds the gradient
	 * animations' `begin`, so a group of beams can be staggered.
	 */
	delay?: number;
	/** Seconds one travel takes. Defaults to a value derived from `seed`. */
	duration?: number;
	/** Pixels added to the start point's x. */
	startXOffset?: number;
	/** Pixels added to the start point's y. */
	startYOffset?: number;
	/** Pixels added to the end point's x. */
	endXOffset?: number;
	/** Pixels added to the end point's y. */
	endYOffset?: number;
	/**
	 * Seed for the default animation duration. The source randomises the
	 * default (`Math.random() * 3 + 4`); a render-path `Math.random()` would
	 * make the server render and its hydration disagree, so the default is
	 * derived deterministically from this seed instead. Two beams with no
	 * `seed` and no `duration` share the same pace — vary the seed (or pass
	 * `duration`) to desynchronise them.
	 */
	seed?: number;
}

/** mulberry32 — a tiny deterministic PRNG standing in for `Math.random()`. */
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
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

import { cn } from "../../utils.js";
import { useFancyId } from "../../internals/use-id.js";

defineOptions({ name: "AnimatedBeam", inheritAttrs: false });

const {
	class: className = "",
	containerRef,
	fromRef,
	toRef,
	curvature = 0,
	reverse = false,
	pathColor = "gray",
	pathWidth = 2,
	pathOpacity = 0.2,
	gradientStartColor = "#FFAA40",
	gradientStopColor = "#9C40FF",
	delay = 0,
	duration,
	startXOffset = 0,
	startYOffset = 0,
	endXOffset = 0,
	endYOffset = 0,
	seed = 1,
} = defineProps<AnimatedBeamProps>();

// Unique ID for the gradient. The source mints one with `Math.random()`, which
// a server render and its hydration would disagree on; `useFancyId()` is the
// SSR-stable equivalent.
const id = useFancyId();
const gradientStroke = computed(() => `url(#${id})`);

// Default duration — the source's `Math.random() * 3 + 4`, seeded.
const resolvedDuration = computed(() => duration ?? mulberry32(seed)() * 3 + 4);

// Reactive state
const isVertical = ref(false);
const isRightToLeft = ref(false);
const isBottomToTop = ref(false);
const pathD = ref("");
const svgDimensions = ref<{ width: number; height: number }>({
	width: 0,
	height: 0,
});

// Derived values for animation
const x1 = computed(() =>
	(reverse ? !isRightToLeft.value : isRightToLeft.value) ? "90%; -10%;" : "10%; 110%;"
);

const x2 = computed(() =>
	(reverse ? !isRightToLeft.value : isRightToLeft.value) ? "100%; 0%;" : "0%; 100%;"
);

const y1 = computed(() =>
	(reverse ? !isBottomToTop.value : isBottomToTop.value) ? "90%; -10%;" : "10%; 110%;"
);

const y2 = computed(() =>
	(reverse ? !isBottomToTop.value : isBottomToTop.value) ? "100%; 0%;" : "0%; 100%;"
);

let resizeObserver: ResizeObserver | undefined = undefined;

// Function to update the path based on the positions of the elements
function updatePath() {
	if (containerRef && fromRef && toRef) {
		const containerRect = containerRef.getBoundingClientRect();
		const rectA = fromRef.getBoundingClientRect();
		const rectB = toRef.getBoundingClientRect();

		const svgWidth = containerRect.width;
		const svgHeight = containerRect.height;
		svgDimensions.value = { width: svgWidth, height: svgHeight };

		const startX = rectA.left - containerRect.left + rectA.width / 2 + startXOffset;
		const startY = rectA.top - containerRect.top + rectA.height / 2 + startYOffset;
		const endX = rectB.left - containerRect.left + rectB.width / 2 + endXOffset;
		const endY = rectB.top - containerRect.top + rectB.height / 2 + endYOffset;

		// Check if the light beam is in a vertical direction
		isVertical.value = Math.abs(endY - startY) > Math.abs(endX - startX);

		// Determine the animation direction
		isRightToLeft.value = endX < startX;
		isBottomToTop.value = endY < startY;

		const controlY = startY - curvature;
		const d = `M ${startX},${startY} Q ${(startX + endX) / 2},${controlY} ${endX},${endY}`;
		pathD.value = d;
	}
}

function disconnect() {
	resizeObserver?.disconnect();
	resizeObserver = undefined;
}

// Setup ResizeObserver — the counterpart of the source's `onMount`.
function observeContainer() {
	disconnect();
	if (!containerRef) return;

	resizeObserver = new ResizeObserver(() => {
		updatePath();
	});
	resizeObserver.observe(containerRef);

	// Initial path calculation
	updatePath();
}

// A template ref in the parent is assigned AFTER this component's props were
// evaluated, so `containerRef` is routinely still null at `onMounted` — the
// source's one-shot `onMount` has no such gap, because a Svelte `bind:this`
// lands before a child's mount callbacks run. Arming from a `post` watcher as
// well is what closes it, and it re-arms if the container is swapped.
onMounted(observeContainer);
watch(() => containerRef, observeContainer, { flush: "post" });
onBeforeUnmount(disconnect);
</script>

<template>
	<svg
		fill="none"
		:width="svgDimensions.width"
		:height="svgDimensions.height"
		xmlns="http://www.w3.org/2000/svg"
		:class="cn('pointer-events-none absolute top-0 left-0 transform-gpu stroke-2', className)"
		:viewBox="`0 0 ${svgDimensions.width} ${svgDimensions.height}`"
	>
		<path
			:d="pathD"
			:stroke="pathColor"
			:stroke-width="pathWidth"
			:stroke-opacity="pathOpacity"
			stroke-linecap="round"
		/>
		<path
			:d="pathD"
			:stroke-width="pathWidth"
			:stroke="gradientStroke"
			stroke-opacity="1"
			stroke-linecap="round"
		/>
		<defs>
			<linearGradient :id="id" gradientUnits="userSpaceOnUse" x1="0%" x2="0%" y1="0%" y2="0%">
				<stop :stop-color="gradientStartColor" stop-opacity="0" />
				<stop :stop-color="gradientStartColor" />
				<stop offset="32.5%" :stop-color="gradientStopColor" />
				<stop offset="100%" :stop-color="gradientStopColor" stop-opacity="0" />
				<template v-if="!isVertical">
					<animate
						attributeName="x1"
						:values="x1"
						:dur="`${resolvedDuration}s`"
						:begin="`${delay}s`"
						keyTimes="0; 1"
						keySplines="0.16 1 0.3 1"
						calcMode="spline"
						repeatCount="indefinite"
					/>
					<animate
						attributeName="x2"
						:values="x2"
						:dur="`${resolvedDuration}s`"
						:begin="`${delay}s`"
						keyTimes="0; 1"
						keySplines="0.16 1 0.3 1"
						calcMode="spline"
						repeatCount="indefinite"
					/>
				</template>
				<template v-else>
					<animate
						attributeName="y1"
						:values="y1"
						:dur="`${resolvedDuration}s`"
						:begin="`${delay}s`"
						keyTimes="0; 1"
						keySplines="0.16 1 0.3 1"
						calcMode="spline"
						repeatCount="indefinite"
					/>
					<animate
						attributeName="y2"
						:values="y2"
						:dur="`${resolvedDuration}s`"
						:begin="`${delay}s`"
						keyTimes="0; 1"
						keySplines="0.16 1 0.3 1"
						calcMode="spline"
						repeatCount="indefinite"
					/>
				</template>
			</linearGradient>
		</defs>
	</svg>
</template>
