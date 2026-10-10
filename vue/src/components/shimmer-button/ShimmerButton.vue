<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface ShimmerButtonProps {
	/** Colour of the sheen */
	shimmerColor?: string;
	/** Thickness of the rim the sheen glints on */
	shimmerSize?: string;
	/** Button border radius */
	borderRadius?: string;
	/** Duration of one sheen cycle: the sweep, then a pause */
	shimmerDuration?: string;
	/** Button background color */
	background?: string;
	/** Custom CSS class */
	class?: HTMLAttributes["class"];
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
	/** Native `disabled`, read to guard the sound cue. */
	disabled?: boolean;
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from "vue";
import { cn } from "../../utils.js";
import { useSoundCue } from "../../sound/use-sound.js";

defineOptions({ name: "ShimmerButton", inheritAttrs: false });

const {
	class: className,
	shimmerColor = "#ffffff",
	shimmerSize = "0.05em",
	borderRadius = "100px",
	shimmerDuration = "3s",
	background = "rgba(0, 0, 0, 1)",
	sound = false,
	disabled = false,
} = defineProps<ShimmerButtonProps>();

defineSlots<{ default?: () => unknown }>();

const attrs = useAttrs();

const playCue = useSoundCue(() => sound);

const styleVars = computed<HTMLAttributes["style"]>(() => ({
	"--shimmer-color": shimmerColor,
	"--radius": borderRadius,
	"--speed": shimmerDuration,
	"--cut": shimmerSize,
	"--bg": background,
}));

// The consumer's own click listener arrives through `v-bind="attrs"` and merges
// after `handleClick` in source order; never call `attrs.onClick` here or it
// would fire twice.
function handleClick() {
	if (!disabled) playCue("press");
}

// The hover sheen follows the pointer: two CSS variables, no re-render. A
// consumer `onPointermove` merges after this one through `v-bind="attrs"`.
function handlePointerMove(event: PointerEvent) {
	const el = event.currentTarget as HTMLButtonElement;
	const rect = el.getBoundingClientRect();
	el.style.setProperty("--mx", `${event.clientX - rect.left}px`);
	el.style.setProperty("--my", `${event.clientY - rect.top}px`);
}

// `v-bind="attrs"` stays AFTER `:style` on purpose: the Svelte source binds
// `style={…}` as a plain attribute before `{...restProps}`, so a consumer
// `style` wins there. `mergeProps` keeps that winner on a conflicting key
// while still keeping the component's other custom properties.
</script>

<template>
	<button
		:class="
			cn(
				'shimmer-button group relative isolate flex cursor-pointer items-center justify-center overflow-hidden [border-radius:var(--radius)] px-6 py-3 whitespace-nowrap text-white/90',
				'transform-gpu transition-[transform,color] duration-300 ease-out hover:text-white active:scale-[0.98]',
				className
			)
		"
		:style="styleVars"
		:disabled="disabled"
		@click="handleClick"
		@pointermove="handlePointerMove"
		v-bind="attrs"
	>
		<!-- Rim: shows around the face, catches the sheen as it passes -->
		<span class="shimmer-button__rim" aria-hidden="true"></span>

		<!-- Face -->
		<span class="shimmer-button__face" aria-hidden="true"></span>

		<!-- Content -->
		<span class="relative z-10"><slot></slot></span>

		<!-- Sweep: a satin band that crosses the button, then rests -->
		<span class="shimmer-button__sheen" aria-hidden="true"></span>

		<!-- Hover: the sheen follows the pointer -->
		<span class="shimmer-button__spot" aria-hidden="true"></span>
	</button>
</template>

<style scoped>
.shimmer-button__rim,
.shimmer-button__face,
.shimmer-button__sheen,
.shimmer-button__spot {
	position: absolute;
	pointer-events: none;
	border-radius: inherit;
}

.shimmer-button__rim {
	inset: 0;
	z-index: -2;
	background: linear-gradient(
		to bottom,
		color-mix(in srgb, var(--shimmer-color) 28%, transparent),
		color-mix(in srgb, var(--shimmer-color) 6%, transparent) 55%,
		color-mix(in srgb, var(--shimmer-color) 14%, transparent)
	);
}

.shimmer-button__face {
	inset: var(--cut);
	z-index: -1;
	border-radius: calc(var(--radius) - var(--cut));
	background:
		linear-gradient(
			to bottom,
			color-mix(in srgb, var(--shimmer-color) 10%, transparent),
			transparent 50%
		),
		var(--bg);
	box-shadow: inset 0 -10px 16px -12px color-mix(in srgb, var(--shimmer-color) 30%, transparent);
}

/* Screen blend: the band lightens the face and lifts the label to full white. */
.shimmer-button__sheen {
	inset: 0;
	z-index: 20;
	mix-blend-mode: screen;
	/* a wide soft halo with a thin brighter core */
	background:
		linear-gradient(
			108deg,
			transparent 44%,
			color-mix(in srgb, var(--shimmer-color) 38%, transparent) 50%,
			transparent 56%
		),
		linear-gradient(
			108deg,
			transparent 30%,
			color-mix(in srgb, var(--shimmer-color) 12%, transparent) 42%,
			color-mix(in srgb, var(--shimmer-color) 18%, transparent) 50%,
			color-mix(in srgb, var(--shimmer-color) 12%, transparent) 58%,
			transparent 70%
		);
	background-size: 250% 100%;
	background-repeat: no-repeat;
	background-position: 100% 0;
	animation: shimmer-sweep var(--speed) cubic-bezier(0.4, 0, 0.2, 1) infinite;
	transition: opacity 0.3s ease;
}

.shimmer-button__spot {
	inset: 0;
	z-index: 20;
	mix-blend-mode: screen;
	opacity: 0;
	background: radial-gradient(
		90px circle at var(--mx, 50%) var(--my, 50%),
		color-mix(in srgb, var(--shimmer-color) 34%, transparent),
		transparent 70%
	);
	transition: opacity 0.3s ease;
}

.shimmer-button:hover .shimmer-button__spot {
	opacity: 1;
}

/* The pointer takes over from the sweep while hovering. */
.shimmer-button:hover .shimmer-button__sheen {
	opacity: 0;
}

.shimmer-button:focus-visible {
	outline: 2px solid color-mix(in srgb, var(--shimmer-color) 70%, transparent);
	outline-offset: 2px;
}

.shimmer-button:disabled {
	cursor: not-allowed;
	opacity: 0.5;
}

.shimmer-button:disabled .shimmer-button__sheen,
.shimmer-button:disabled .shimmer-button__spot {
	display: none;
}

/* Sweep across in the first 55% of the cycle, then rest off-button. */
@keyframes shimmer-sweep {
	0% {
		background-position: 100% 0;
	}
	55%,
	100% {
		background-position: 0% 0;
	}
}

@media (prefers-reduced-motion: reduce) {
	.shimmer-button__sheen {
		animation: none;
		background-position: 38% 0;
		opacity: 0.6;
	}
}
</style>
