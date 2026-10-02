<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface DirectionAwareHoverProps {
	imageUrl: string;
	imageAlt?: string;
	childrenClass?: string;
	imageClass?: string;
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from "vue";

import { cn } from "../../utils.js";
import { composeRefs } from "../../internals/dom/compose-refs.js";
import { linear } from "../../internals/motion/easing.js";
import { usePresence } from "../../internals/motion/presence.js";
import type { TransitionSpec } from "../../internals/motion/transitions.js";

defineOptions({ name: "DirectionAwareHover", inheritAttrs: false });

type Direction = "top" | "bottom" | "left" | "right";

const {
	imageUrl,
	imageAlt = "image",
	childrenClass: childrenClassProp = "",
	imageClass: imageClassProp = "",
	class: className = "",
} = defineProps<DirectionAwareHoverProps>();

defineSlots<{
	default?: () => unknown;
}>();

/**
 * The source's stock fade transition with `{ duration: 300 }`: capture the
 * element's computed opacity, then run `opacity: t * o` under linear easing.
 * Bidirectional — the same spec drives both legs.
 *
 * The spec is MEMOISED per node, and that is the whole point of the factory.
 * The source's transition runtime builds a transition's config ONCE and reuses
 * it for as long as a leg is in flight, precisely so a reversal continues on
 * the curve it was already on instead of jumping to a new one; it discards the
 * memo only when an entrance finishes. `o` is sampled from the LIVE computed
 * opacity, so rebuilding per leg — which is what the presence core does, since
 * it calls the transition function at the start of every leg while the
 * counterpart animation is still driving the element — would re-sample the
 * in-flight value: re-hovering halfway through the fade-out would capture
 * `o = 0.5`, start the entrance at `opacity: 0.25`, and land at `0.5`. Hence
 * one memo per element, cleared on enter-end through `onEnterEnd` below.
 */
function createFade300(): { transition: (node: Element) => TransitionSpec; clear: () => void } {
	let memoNode: Element | null = null;
	let memoSpec: TransitionSpec | null = null;

	return {
		transition(node) {
			if (memoSpec && memoNode === node) return memoSpec;
			const o = +getComputedStyle(node).opacity;
			memoNode = node;
			memoSpec = {
				delay: 0,
				duration: 300,
				easing: linear,
				css: (t) => `opacity: ${t * o}`,
			};
			return memoSpec;
		},
		clear() {
			memoNode = null;
			memoSpec = null;
		},
	};
}

const divRef = useTemplateRef<HTMLDivElement>("divRef");
const direction = ref<Direction | null>(null);
const isTouched = ref(false);
// Reactive, mirroring the source's own `$state(false)`, even though nothing in
// the markup reads it today: the mapping table's `$state` → `ref` row is not
// conditional on a value happening to be observed.
const isMobile = ref(false);
let touchTimer: ReturnType<typeof setTimeout> | null = null;

/** The last non-null direction. The source's transition-aware conditional
 *  block goes inert while it outros, freezing the overlay's class at its last
 *  hovered value for the whole fade-out; Vue's presence-gated node keeps its
 *  own effect scope alive, but the frozen value is reproduced explicitly to
 *  match the source's actual behaviour. */
const lastDirection = ref<Direction | null>(null);

function detectMobile() {
	isMobile.value = window.matchMedia("(max-width: 768px)").matches || "ontouchstart" in window;
}

function getDirection(
	ev: MouseEvent | { clientX: number; clientY: number },
	obj: HTMLElement
): number {
	const { width: w, height: h, left, top } = obj.getBoundingClientRect();
	const x = ev.clientX - left - (w / 2) * (w > h ? h / w : 1);
	const y = ev.clientY - top - (h / 2) * (h > w ? w / h : 1);
	const d = Math.round(Math.atan2(y, x) / 1.57079633 + 5) % 4;
	return d;
}

function mapDirection(d: number): Direction {
	switch (d) {
		case 0:
			return "top";
		case 1:
			return "right";
		case 2:
			return "bottom";
		case 3:
			return "left";
		default:
			return "left";
	}
}

function handleMouseEnter(event: MouseEvent) {
	if (isMobile.value) return;
	if (!divRef.value) return;

	const fetchedDirection = getDirection(event, divRef.value);
	direction.value = mapDirection(fetchedDirection);
	lastDirection.value = direction.value;
}

function handleMouseLeave() {
	if (isMobile.value) return;
	direction.value = null;
}

function handleTouchStart(event: TouchEvent) {
	if (!isMobile.value) return;

	isTouched.value = true;

	if (!divRef.value) return;
	// A touchstart always carries at least one touch; the assertion only
	// silences the indexed-access check.
	const touch = event.touches[0]!;
	const fetchedDirection = getDirection(
		{ clientX: touch.clientX, clientY: touch.clientY },
		divRef.value
	);
	direction.value = mapDirection(fetchedDirection);
	lastDirection.value = direction.value;

	// Auto-hide after 3 seconds on mobile
	if (touchTimer) clearTimeout(touchTimer);
	touchTimer = setTimeout(() => {
		handleTouchEnd();
	}, 3000);
}

function handleTouchEnd() {
	if (touchTimer) {
		clearTimeout(touchTimer);
		touchTimer = null;
	}

	setTimeout(() => {
		direction.value = null;
		isTouched.value = false;
	}, 300);
}

const containerClass = computed(() =>
	cn(
		"group/card relative overflow-hidden rounded-lg bg-transparent transition-all duration-300",
		"h-48 w-48",
		"sm:h-64 sm:w-64",
		"md:h-80 md:w-80",
		"lg:h-96 lg:w-96",
		"xl:h-[28rem] xl:w-[28rem]",
		"touch-manipulation",
		"active:scale-[0.98]",
		"md:active:scale-100",
		className
	)
);

const imageClass = computed(() =>
	cn(
		"h-full w-full object-cover transition-transform duration-300",
		"scale-125",
		"sm:scale-[1.35]",
		"md:scale-150",
		imageClassProp
	)
);

const childrenClass = computed(() =>
	cn(
		"absolute z-40 text-white transition-opacity duration-300",
		"bottom-2 left-2 text-sm",
		"sm:bottom-3 sm:left-3 sm:text-base",
		"md:bottom-4 md:left-4 md:text-lg",
		childrenClassProp
	)
);

// While the overlay is exiting (`direction` already null), its class is
// frozen at the last hovered direction — see `lastDirection` above.
const overlayDirection = computed(() => direction.value ?? lastDirection.value);

const overlayClass = computed(() => {
	const baseClasses = "absolute inset-0 z-10 transition-all duration-300";
	const backgroundClasses = "bg-black/40 dark:bg-black/60";

	let transformClasses = "";
	switch (overlayDirection.value) {
		case "top":
			transformClasses = "-translate-y-full group-hover/card:translate-y-0";
			break;
		case "bottom":
			transformClasses = "translate-y-full group-hover/card:translate-y-0";
			break;
		case "left":
			transformClasses = "-translate-x-full group-hover/card:translate-x-0";
			break;
		case "right":
			transformClasses = "translate-x-full group-hover/card:translate-x-0";
			break;
		default:
			transformClasses = "";
	}

	return cn(baseClasses, backgroundClasses, transformClasses);
});

const imageContainerClass = computed(() =>
	cn("relative size-full bg-gray-50 transition-transform duration-300 dark:bg-black", {
		"translate-y-2 md:translate-y-5": direction.value === "top",
		"-translate-y-2 md:-translate-y-5": direction.value === "bottom",
		"translate-x-2 md:translate-x-5": direction.value === "left",
		"-translate-x-2 md:-translate-x-5": direction.value === "right",
	})
);

// Two independent conditional blocks in the source, each with its own
// `transition:fade` — so two clocks and two memos, never one shared pair.
const overlayFade = createFade300();
const overlayPresence = usePresence(() => direction.value !== null, {
	onEnterEnd: overlayFade.clear,
});
const overlayRef = composeRefs<HTMLDivElement>(overlayPresence.register(overlayFade.transition));

const contentFade = createFade300();
const contentPresence = usePresence(() => direction.value !== null || isTouched.value, {
	onEnterEnd: contentFade.clear,
});
const contentRef = composeRefs<HTMLDivElement>(contentPresence.register(contentFade.transition));

onMounted(() => {
	detectMobile();
	window.addEventListener("resize", detectMobile);

	onBeforeUnmount(() => {
		window.removeEventListener("resize", detectMobile);
		if (touchTimer) {
			clearTimeout(touchTimer);
		}
	});
});
</script>

<template>
	<div
		ref="divRef"
		:class="containerClass"
		role="figure"
		@mouseenter="handleMouseEnter"
		@mouseleave="handleMouseLeave"
		@touchstart="handleTouchStart"
		@touchend="handleTouchEnd"
	>
		<div class="relative size-full overflow-hidden">
			<div v-if="overlayPresence.mounted" :ref="overlayRef" :class="overlayClass"></div>

			<div :class="imageContainerClass">
				<img :src="imageUrl" :alt="imageAlt" :class="imageClass" width="1000" height="1000" />
			</div>

			<div v-if="contentPresence.mounted" :ref="contentRef" :class="childrenClass">
				<slot />
			</div>
		</div>
	</div>
</template>

<style scoped>
/* The source wraps both selectors below in `:global()`. That wrapper is NOT
   carried over, and the omission is deliberate rather than a slip.

   On the source side `:global()` buys nothing but reach the rules never
   wanted: its compiler PRUNES a scoped selector it cannot statically match,
   and `group/card` arrives through a `cn()` call it cannot read, so the first
   rule would have been dropped as unused without the escape hatch. This
   compiler prunes nothing, so a plain selector keeps the rule AND keeps it on
   this component.

   Reach is the other half. Scoped styles here aggregate into the one packaged
   stylesheet every consumer imports once, so `:global(*)` would emit a bare
   `*` rule — verified: the scoped compiler leaves it entirely unattributed —
   forcing a document-wide `!important` transition override, plus a
   `.group\/card` min-box rule, on every app importing the package, including
   apps that never render this component. `group/card` is a shared named-group
   vocabulary rather than this component's identity, so that second
   consequence would reach arbitrary consumer markup.

   Dropped, the selectors compile to `.group\/card[data-v-…]` and
   `[data-v-…], [data-v-…-s]`: this component's own elements plus its slot
   content — the element the source targeted, and the subtree it meant. */

/* Enhanced mobile touch targets */
@media (max-width: 768px) {
	.group\/card {
		min-height: 44px;
		min-width: 44px;
	}
}

/* Smooth transitions for reduced motion preference */
@media (prefers-reduced-motion: reduce) {
	*,
	:slotted(*) {
		transition-duration: 0.1s !important;
	}
}
</style>
