<script lang="ts">
/**
 * The row-wide pointer pose, read live. Declared as a getter pair rather than
 * two numbers so an avatar that is NOT drawing a tooltip takes no dependency
 * on it at all — the same granularity the source gets from reading its two
 * derived values inside the hovered item's conditional block.
 */
export interface TooltipPointer {
	readonly rotation: number;
	readonly translation: number;
}
</script>

<script setup lang="ts">
/**
 * One avatar and its conditional tooltip — split out of `AnimatedTooltip.vue`
 * because each avatar owns its own presence clock (the mount/unmount timing
 * the source's `{#if hoveredIndex === item.id}` + `transition:scale` block
 * owned natively per `{#each}` iteration). A composable can only be called
 * once per component instance, so one clock per avatar means one component
 * per avatar. Every piece of SHARED state stays in the parent, where the
 * source keeps it; this file owns nothing but its own clock.
 *
 * The five handlers are the parent's, bound here so `event.currentTarget` is
 * this wrapper — the element the source's handlers measure.
 */
import { computed, ref } from "vue";

import { composeRefs } from "../../internals/dom/compose-refs.js";
import { usePresence } from "../../internals/motion/presence.js";
import type { TransitionSpec } from "../../internals/motion/transitions.js";
import type { TooltipItem } from "./AnimatedTooltip.vue";

defineOptions({ name: "AnimatedTooltipAvatar", inheritAttrs: false });

const props = defineProps<{
	item: TooltipItem;
	hovered: boolean;
	pointer: TooltipPointer;
	onItemMouseEnter: (event: MouseEvent, itemId: number | string) => void;
	onItemMouseLeave: () => void;
	onItemMouseMove: (event: MouseEvent) => void;
	onItemFocusIn: (itemId: number | string) => void;
	onItemFocusOut: () => void;
}>();

function tooltipId(itemId: number | string): string {
	return `animated-tooltip-${itemId}`;
}

/**
 * The pose this tooltip is DRAWN at: the row-wide pointer pose, sampled and
 * held. The hold is the source's freeze-on-exit, reproduced rather than
 * invented: the source's `{#if}` block is paused the instant its item stops
 * being the hovered one, so a leaving tooltip keeps the rotation/translation
 * it was last drawn at while the shared offset carries on changing underneath
 * it — and `handleMouseLeave` resets that offset to 0, so without the hold the
 * tooltip would snap back to centre as it scaled away. It matters for more
 * than one frame: `tooltipScale` samples the computed transform once, at leg
 * start, and bakes it into every keyframe of the 200ms exit.
 *
 * `held` is a plain binding, not a `ref`: it is a cache of what was already
 * rendered, never a source of truth, and making it reactive would make this
 * computed depend on its own output.
 */
let held: { rotation: number; translation: number } = { rotation: 0, translation: 0 };
const pose = computed<{ rotation: number; translation: number }>(() => {
	if (props.hovered) {
		held = { rotation: props.pointer.rotation, translation: props.pointer.translation };
	}
	return held;
});

function handleMouseEnter(event: MouseEvent): void {
	props.onItemMouseEnter(event, props.item.id);
}

function handleFocusIn(): void {
	props.onItemFocusIn(props.item.id);
}

/** The ease-out cubic `svelte/transition`'s `scale` falls back to when no
 *  `easing` param is given: `f = t - 1; f³ + 1`. Not in `motion/easing.ts`
 *  (that module holds only the two expo curves the shared token table
 *  names), so it lives here, next to its one caller. */
function cubicOut(t: number): number {
	const f = t - 1.0;
	return f * f * f + 1.0;
}

/**
 * Mirrors the source's stock `scale` transition, called with
 * `{ duration: 200, start: 0.6 }`: capture the element's computed opacity and
 * transform at leg start, then run `scale(1 - sd·u)` / `opacity(target -
 * od·u)` under the ease-out cubic above. Captures the transform already on
 * the node — the pointer-tracked `translateX(...) rotate(...)` the `:style`
 * binding below just wrote — so the scale composes on top of it instead of
 * replacing it, exactly as the source's own `scale()` does.
 */
function tooltipScale(node: Element): TransitionSpec {
	const style = getComputedStyle(node);
	const targetOpacity = +style.opacity;
	const transform = style.transform === "none" ? "" : style.transform;
	const sd = 1 - 0.6; // 1 - start
	const od = targetOpacity; // target_opacity * (1 - opacity), opacity = 0

	return {
		delay: 0,
		duration: 200,
		easing: cubicOut,
		css: (_t, u) => `
			transform: ${transform} scale(${1 - sd * u});
			opacity: ${targetOpacity - od * u}
		`,
	};
}

/**
 * The spec the leg currently in flight was built from, reused by any leg that
 * reverses it — the source's own bidirectional `transition:` calls its factory
 * ONCE for as long as the block exists, mid-flight reversal included, so a
 * quick hover-out-then-back-in reads the ORIGINAL captured transform/opacity
 * rather than a live, already-scaled one. `register`'s `buildSpec` here calls
 * the transition function fresh at EVERY leg (enter and exit alike), so
 * without this cache a reversal mid-entrance would compose `scale()` on top of
 * an already-shrunk `getComputedStyle` read, popping the tooltip to a doubly
 * shrunk pose. Cleared on enter finish (a settled entrance means the next
 * outro's fresh capture already equals the resting state, so recomputing then
 * is harmless) and on a full detach (the next mount is a new element, and
 * owes a new capture).
 */
const cachedSpec = ref<TransitionSpec | null>(null);

function tooltipTransition(node: Element): TransitionSpec {
	return (cachedSpec.value ??= tooltipScale(node));
}

const presence = usePresence(() => props.hovered, {
	onEnterEnd: () => {
		cachedSpec.value = null;
	},
});

// A plain sink, not `useTemplateRef`: the node arrives through the composed
// function ref below.
const tooltip = ref<HTMLElement | null>(null);

function attach(node: HTMLElement | null): void {
	tooltip.value = node;
	if (!node) cachedSpec.value = null;
}

// Built once in `setup`: its identity must not change between patches, or Vue
// detaches and reattaches the node and throws the in-flight leg away.
const tooltipRef = composeRefs<HTMLElement>(attach, presence.register(tooltipTransition));
</script>

<template>
	<div
		class="group relative -mr-4"
		tabindex="0"
		:aria-describedby="hovered ? tooltipId(item.id) : undefined"
		@mouseenter="handleMouseEnter"
		@mouseleave="onItemMouseLeave"
		@mousemove="onItemMouseMove"
		@focusin="handleFocusIn"
		@focusout="onItemFocusOut"
	>
		<!-- Tooltip -->
		<div
			v-if="presence.mounted"
			:id="tooltipId(item.id)"
			:ref="tooltipRef"
			role="tooltip"
			class="pointer-events-none absolute -top-16 left-1/2 z-50 flex flex-col items-center justify-center rounded-md bg-black px-4 py-2 text-xs whitespace-nowrap shadow-xl"
			:style="{
				transform: `translateX(calc(-50% + ${pose.translation}px)) rotate(${pose.rotation}deg)`,
			}"
		>
			<!-- Gradient lines -->
			<div
				class="absolute right-1/2 -bottom-px z-30 me-1 h-px w-2/5 translate-x-1/2 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"
			></div>
			<div
				class="absolute -bottom-px left-1/2 z-30 ms-1 h-px w-2/5 -translate-x-1/2 bg-gradient-to-r from-transparent via-sky-500 to-transparent"
			></div>

			<!-- Content -->
			<div class="relative z-30 text-base font-bold text-white">
				{{ item.name }}
			</div>
			<div class="text-xs text-white">{{ item.designation }}</div>
		</div>

		<!-- Avatar Image -->
		<img
			:src="item.image"
			:alt="item.name"
			class="relative !m-0 size-14 rounded-full border-2 border-white object-cover object-top !p-0 transition duration-500 group-hover:z-30 group-hover:scale-105"
		/>
	</div>
</template>
