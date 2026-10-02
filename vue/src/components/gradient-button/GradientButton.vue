<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface GradientButtonProps {
	/** Gradient colors for the conic-gradient border */
	colors?: string[];
	/** Animation duration in milliseconds */
	duration?: number;
	/** Border width in pixels */
	borderWidth?: number;
	/** Border radius in pixels */
	borderRadius?: number;
	/** Blur amount for the gradient in pixels */
	blur?: number;
	/** Background color of the button content area */
	bgColor?: string;
	/** Custom CSS class */
	class?: HTMLAttributes["class"];
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
	/** Native `disabled`, read to guard the sound cue. */
	disabled?: boolean;
	/** Native click handler, kept as a prop and re-dispatched after the cue. */
	onclick?: (event: MouseEvent) => void;
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from "vue";
import { cn } from "../../utils.js";
import { sound as soundFx } from "../../sound/sound.js";

defineOptions({ name: "GradientButton", inheritAttrs: false });

const {
	class: className,
	colors = ["#FF0000", "#FFA500", "#FFFF00", "#008000", "#0000FF", "#4B0082", "#EE82EE", "#FF0000"],
	duration = 2500,
	borderWidth = 2,
	borderRadius = 8,
	blur = 4,
	bgColor = "#000",
	onclick,
	sound = false,
	disabled = false,
} = defineProps<GradientButtonProps>();

defineSlots<{ default?: () => unknown }>();

const attrs = useAttrs();

const styleVars = computed<HTMLAttributes["style"]>(() => ({
	"--gb-colors": colors.join(", "),
	"--gb-duration": `${duration}ms`,
	"--gb-border-width": `${borderWidth}px`,
	"--gb-border-radius": `${borderRadius}px`,
	"--gb-blur": `${blur}px`,
	"--gb-bg-color": bgColor,
}));

function handleClick(event: MouseEvent) {
	if (sound && !disabled) soundFx.play("press");
	onclick?.(event as MouseEvent & { currentTarget: EventTarget & HTMLButtonElement });
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
				'gradient-button relative flex min-h-10 min-w-28 cursor-pointer items-center justify-center overflow-hidden',
				className
			)
		"
		:style="styleVars"
		:disabled="disabled"
		@click="handleClick"
		v-bind="attrs"
	>
		<!-- Rotating conic-gradient pseudo-element -->
		<span class="gradient-border" aria-hidden="true"></span>

		<!-- Content area -->
		<span class="gradient-content inline-flex size-full items-center justify-center px-4 py-2">
			<slot></slot>
		</span>
	</button>
</template>

<style scoped>
.gradient-button {
	padding: var(--gb-border-width);
	border-radius: var(--gb-border-radius);
	isolation: isolate;
}

.gradient-border {
	content: "";
	position: absolute;
	inset: -200%;
	z-index: -1;
	background: conic-gradient(var(--gb-colors));
	animation: rotate-gradient var(--gb-duration) linear infinite;
	filter: blur(var(--gb-blur));
}

.gradient-content {
	border-radius: var(--gb-border-radius);
	background-color: var(--gb-bg-color);
}

@keyframes rotate-gradient {
	0% {
		transform: rotate(0deg);
	}
	100% {
		transform: rotate(360deg);
	}
}
</style>
