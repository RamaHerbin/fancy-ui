<script lang="ts">
/**
 * The row-wide pointer pose, read live. Declared as a getter pair rather than
 * two numbers so an avatar that is NOT drawing a tooltip takes no dependency
 * on it at all — the same granularity the source gets from reading its two
 * derived values inside the active item's conditional block.
 */
export interface TooltipPointer {
	readonly rotation: number;
	readonly translation: number;
}
</script>

<script setup lang="ts">
/**
 * One avatar of the presence stack and its conditional tooltip — split out of
 * `AnimatedTooltip.vue` because each avatar owns its own presence clock (the
 * mount/unmount timing the source's `{#if active}` block and the card's
 * `out:sink` owned natively per `{#each}` iteration). A composable can only be
 * called once per component instance, so one clock per avatar means one
 * component per avatar. Every piece of SHARED state (hovered id, pointer
 * offset, reduced motion, the parting offsets) stays in the parent, where the
 * source keeps it; this file owns nothing but its own clock.
 *
 * The five handlers are the parent's, bound here so `event.currentTarget` is
 * this wrapper — the element the source's handlers measure.
 */
import { computed } from "vue";

import { cn } from "../../utils.js";
import { composeRefs } from "../../internals/dom/compose-refs.js";
import { useFancyId } from "../../internals/use-id.js";
import { linear } from "../../internals/motion/easing.js";
import { usePresence } from "../../internals/motion/presence.js";
import type { TransitionDirection, TransitionSpec } from "../../internals/motion/transitions.js";
import type { TooltipItem } from "./AnimatedTooltip.vue";

defineOptions({ name: "AnimatedTooltipAvatar", inheritAttrs: false });

const props = defineProps<{
	item: TooltipItem;
	active: boolean;
	/** This item's parting offset in px (the row's `partOffset(i)`). */
	shift: number;
	reduced: boolean;
	pointer: TooltipPointer;
	onItemMouseEnter: (event: MouseEvent, itemId: number | string) => void;
	onItemMouseLeave: () => void;
	onItemMouseMove: (event: MouseEvent) => void;
	onItemFocusIn: (itemId: number | string) => void;
	onItemFocusOut: () => void;
}>();

// One generated id per avatar instance, never derived from `item.id`: a
// consumer's item id may contain whitespace (which splits `aria-describedby`
// into several references) and repeats across two rows fed the same items,
// which would point an avatar at another row's tooltip. (Upstream fix: the
// Svelte source still builds `animated-tooltip-${item.id}`.)
const tooltipId = `${useFancyId()}-tooltip`;

/**
 * The pose this tooltip is DRAWN at: the row-wide pointer pose, sampled and
 * held. The hold is the source's freeze-on-exit, reproduced rather than
 * invented: the source's `{#if}` block is paused the instant its item stops
 * being the active one, so a leaving card keeps the lean it was last drawn at
 * while the shared offset carries on changing underneath it — and
 * `handleMouseLeave` resets that offset to 0, so without the hold the card
 * would swing back to centre as it sinks away.
 *
 * `held` is a plain binding, not a `ref`: it is a cache of what was already
 * rendered, never a source of truth, and making it reactive would make this
 * computed depend on its own output.
 */
let held: { rotation: number; translation: number } = { rotation: 0, translation: 0 };
const pose = computed<{ rotation: number; translation: number }>(() => {
	if (props.active) {
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

/**
 * The entrance leg. The source's card has an `out:` transition only — its
 * entrance is the CSS `at-rise` keyframe — so this leg paints nothing (an
 * empty declaration list samples to empty keyframes). It still has a non-zero
 * duration on purpose: a leg that reverses a running exit must ABORT that exit
 * (the source's own intro on an out-only transition aborts and resets the
 * outro), and only a timed leg reads and aborts its counterpart — a
 * zero-duration one finishes synchronously and would leave the exit's
 * fill-forward frame holding the card invisible.
 */
const ENTER: TransitionSpec = { delay: 0, duration: 1, easing: linear, css: () => "" };

/** Exit: a short settle downward (opacity only under reduced motion). */
function sink(
	_node: Element,
	_params?: unknown,
	options?: { direction: TransitionDirection }
): TransitionSpec {
	if (options?.direction === "in") return ENTER;
	const still = props.reduced;
	return {
		delay: 0,
		duration: still ? 120 : 160,
		easing: (t: number) => t * t,
		css: (t: number) =>
			still
				? `opacity: ${t};`
				: `opacity: ${t}; transform: translateY(${(1 - t) * 4}px) scale(${0.97 + 0.03 * t});`,
	};
}

const presence = usePresence(() => props.active);

// Built once in `setup`: its identity must not change between patches, or Vue
// detaches and reattaches the node and throws the in-flight leg away. Attached
// to `.at-card`, the element the source's `out:sink` sits on (and the one its
// runtime makes `inert` while the exit plays).
const cardRef = composeRefs<HTMLDivElement>(presence.register(sink));
</script>

<template>
	<div
		:class="cn('at-item group relative', active && 'at-active', shift !== 0 && 'at-parted')"
		:style="{ '--_at-shift': `${shift}px` }"
		:data-active="active ? '' : undefined"
		:data-part="shift < 0 ? 'before' : shift > 0 ? 'after' : undefined"
		tabindex="0"
		:aria-describedby="active ? tooltipId : undefined"
		@mouseenter="handleMouseEnter"
		@mouseleave="onItemMouseLeave"
		@mousemove="onItemMouseMove"
		@focusin="handleFocusIn"
		@focusout="onItemFocusOut"
	>
		<!-- Tooltip -->
		<div
			v-if="presence.mounted"
			:id="tooltipId"
			role="tooltip"
			class="at-tip pointer-events-none absolute left-1/2 z-50"
			:style="{
				transform: `translateX(calc(-50% + ${pose.translation}px)) rotate(${pose.rotation}deg)`,
			}"
		>
			<div :ref="cardRef" class="at-card">
				<span class="at-pointer" aria-hidden="true"></span>
				<div class="at-name">{{ item.name }}</div>
				<span class="at-rule" aria-hidden="true"><span class="at-glint"></span></span>
				<div class="at-role">{{ item.designation }}</div>
			</div>
		</div>

		<!-- Avatar: presence ring + photo -->
		<div :class="cn('at-avatar', active && !reduced && 'at-lifted')">
			<span class="at-glow" aria-hidden="true"></span>
			<span class="at-disc" aria-hidden="true"></span>
			<span class="at-ring" aria-hidden="true"></span>
			<img
				:src="item.image"
				:alt="item.name"
				class="at-img relative !m-0 rounded-full object-cover object-top !p-0"
			/>
		</div>
	</div>
</template>

<style scoped>
@property --at-angle {
	syntax: "<angle>";
	inherits: false;
	initial-value: 0deg;
}

/* ---------- stack ---------- */

.at-item {
	outline: none;
	transform: translateX(var(--_at-shift, 0px));
}

.at-item:not(:last-child) {
	margin-inline-end: calc(var(--_at-size) * -0.285);
}

.at-item.at-active {
	z-index: 30;
}

.at-avatar {
	position: relative;
	width: var(--_at-size);
	height: var(--_at-size);
	border-radius: 9999px;
	isolation: isolate;
	transform-origin: 50% 60%;
}

/* The hairline that separates stacked avatars, in the page colour. */
.at-disc {
	position: absolute;
	inset: 0;
	z-index: 1;
	border-radius: 9999px;
	background: var(--_at-sep);
	box-shadow: 0 0 0 2px var(--_at-sep);
}

.at-avatar.at-lifted {
	transform: translateY(-4px) scale(1.08);
}

.at-img {
	position: absolute;
	inset: 3px;
	width: calc(100% - 6px);
	height: calc(100% - 6px);
	z-index: 3;
}

/* The lit ring is the focus indicator; forced-colors mode strips it, so
   fall back to a system-coloured outline there. */
@media (forced-colors: active) {
	.at-item:focus-visible .at-avatar {
		outline: 2px solid Highlight;
		outline-offset: 2px;
	}
}

/* ---------- presence ring ---------- */

.at-ring,
.at-glow {
	position: absolute;
	border-radius: 9999px;
	background: conic-gradient(
		from var(--at-angle),
		var(--_at-a) 0deg,
		var(--_at-b) 150deg,
		var(--_at-core) 205deg,
		var(--_at-a) 260deg,
		var(--_at-a) 360deg
	);
}

.at-ring {
	inset: 0;
	z-index: 2;
	padding: 2px;
	-webkit-mask:
		linear-gradient(#000 0 0) content-box,
		linear-gradient(#000 0 0);
	-webkit-mask-composite: xor;
	mask:
		linear-gradient(#000 0 0) content-box exclude,
		linear-gradient(#000 0 0);
	opacity: 0.35;
	transition: opacity 300ms var(--_at-ease-inout);
}

.at-glow {
	inset: -3px;
	z-index: 0;
	filter: blur(7px);
	opacity: 0;
	transition: opacity 300ms var(--_at-ease-inout);
}

.at-active .at-ring {
	opacity: 1;
}

.at-active .at-glow {
	opacity: 0.55;
}

/* ---------- glass card ---------- */

.at-tip {
	bottom: calc(100% + 12px);
	transform-origin: 50% 100%;
}

.at-card {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 5px;
	padding: 8px 14px 9px;
	border-radius: 10px;
	white-space: nowrap;
	background: var(--_at-card-bg);
	border: 1px solid var(--_at-card-line);
	box-shadow:
		inset 0 1px 0 var(--_at-card-hi),
		var(--_at-card-shadow);
	-webkit-backdrop-filter: blur(12px) saturate(1.4);
	backdrop-filter: blur(12px) saturate(1.4);
	transform-origin: 50% 100%;
	animation: at-fade 160ms var(--_at-ease-out) both;
}

.at-pointer {
	position: absolute;
	left: 50%;
	bottom: -5px;
	width: 9px;
	height: 9px;
	margin-left: -4.5px;
	background: var(--_at-card-bg);
	border-right: 1px solid var(--_at-card-line);
	border-bottom: 1px solid var(--_at-card-line);
	border-bottom-right-radius: 2px;
	transform: rotate(45deg);
	clip-path: polygon(100% 0, 100% 100%, 0 100%);
	-webkit-backdrop-filter: blur(12px);
	backdrop-filter: blur(12px);
}

.at-name {
	font-size: 0.8125rem;
	line-height: 1.1rem;
	font-weight: 600;
	letter-spacing: -0.005em;
	color: var(--_at-name);
}

.at-role {
	font-size: 0.6875rem;
	line-height: 0.9rem;
	color: var(--_at-role);
}

/* One thin line of light under the name: a faint resting hairline plus a
   glint that sweeps across it once when the card opens. */
.at-rule {
	position: relative;
	display: block;
	width: 100%;
	min-width: 64px;
	height: 7px;
	margin: -3px 0;
	overflow: clip;
	background: linear-gradient(
			90deg,
			transparent,
			color-mix(in oklab, var(--_at-a) 50%, transparent) 30%,
			color-mix(in oklab, var(--_at-b) 50%, transparent) 70%,
			transparent
		)
		center / 100% 1px no-repeat;
}

.at-glint {
	display: none;
}

@media (prefers-reduced-motion: no-preference) {
	.at-item {
		transition: transform 380ms var(--_at-ease-out);
	}

	.at-avatar {
		transition: transform 420ms var(--_at-ease-out);
	}

	.at-ring,
	.at-glow {
		transition:
			opacity 300ms var(--_at-ease-inout),
			--at-angle 900ms var(--_at-ease-out);
	}

	.at-active .at-ring,
	.at-active .at-glow {
		--at-angle: 140deg;
	}

	.at-tip {
		transition: transform 240ms var(--_at-ease-out);
	}

	.at-card {
		animation: at-rise 260ms var(--_at-ease-rise) both;
	}

	.at-glint {
		display: block;
		position: absolute;
		top: 3px;
		left: 0;
		width: 60%;
		height: 1px;
		border-radius: 1px;
		background: linear-gradient(
			90deg,
			transparent,
			var(--_at-a) 25%,
			var(--_at-core) 50%,
			var(--_at-b) 75%,
			transparent
		);
		/* Soft halo so a 1px line still reads as light. */
		filter: drop-shadow(0 0 2px var(--_at-a)) drop-shadow(0 0 4px var(--_at-b));
		transform: translateX(-110%);
		animation: at-sweep 760ms var(--_at-ease-inout) 90ms both;
	}
}

@keyframes at-rise {
	from {
		opacity: 0;
		transform: translateY(6px) scale(0.94);
	}
	to {
		opacity: 1;
		transform: none;
	}
}

@keyframes at-fade {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}

@keyframes at-sweep {
	from {
		transform: translateX(-110%);
	}
	to {
		transform: translateX(180%);
	}
}
</style>
