<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface ShimmerButtonProps {
	/** Shimmer highlight color */
	shimmerColor?: string;
	/** Thickness of the shimmer border */
	shimmerSize?: string;
	/** Button border radius */
	borderRadius?: string;
	/** Duration of the shimmer animation cycle */
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
	"--spread": "90deg",
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

// `v-bind="attrs"` stays AFTER `:style` on purpose: the Svelte source binds
// `style={…}` as a plain attribute before `{...restProps}`, so a consumer
// `style` wins there. `mergeProps` keeps that winner on a conflicting key
// while still keeping the component's other custom properties.
</script>

<template>
	<button
		:class="
			cn(
				'shimmer-button group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden [border-radius:var(--radius)] border border-white/10 px-6 py-3 whitespace-nowrap text-white [background:var(--bg)]',
				'transform-gpu transition-transform duration-300 ease-in-out active:translate-y-px',
				className
			)
		"
		:style="styleVars"
		:disabled="disabled"
		@click="handleClick"
		v-bind="attrs"
	>
		<!-- Shimmer layer -->
		<div class="[container-type:size] absolute inset-0 -z-30 overflow-visible blur-[2px]">
			<div
				class="shimmer-slide absolute inset-0 [aspect-ratio:1] h-[100cqh] [border-radius:0] [mask:none]"
			>
				<div
					class="spin-around absolute -inset-full w-auto [translate:0_0] rotate-0 [background:conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))]"
				></div>
			</div>
		</div>

		<!-- Content -->
		<slot></slot>

		<!-- Inner shadow overlay -->
		<div
			:class="
				cn(
					'insert-0 absolute size-full',
					'rounded-2xl px-4 py-1.5 text-sm font-medium shadow-[inset_0_-8px_10px_#ffffff1f]',
					'transform-gpu transition-all duration-300 ease-in-out',
					'group-hover:shadow-[inset_0_-6px_10px_#ffffff3f]',
					'group-active:shadow-[inset_0_-10px_10px_#ffffff3f]'
				)
			"
		></div>

		<!-- Background fill -->
		<div
			class="absolute [inset:var(--cut)] -z-20 [border-radius:var(--radius)] [background:var(--bg)]"
		></div>
	</button>
</template>

<style scoped>
@keyframes shimmer-slide {
	to {
		transform: translate(calc(100cqw - 100%), 0);
	}
}

@keyframes spin-around {
	0% {
		transform: translateZ(0) rotate(0);
	}
	15%,
	35% {
		transform: translateZ(0) rotate(90deg);
	}
	65%,
	85% {
		transform: translateZ(0) rotate(270deg);
	}
	100% {
		transform: translateZ(0) rotate(360deg);
	}
}

.shimmer-slide {
	animation: shimmer-slide var(--speed) ease-in-out infinite alternate;
}

.spin-around {
	animation: spin-around calc(var(--speed) * 2) infinite linear;
}
</style>
