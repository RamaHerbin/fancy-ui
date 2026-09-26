<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface RippleButtonProps {
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
	/** Color of the ripple effect */
	rippleColor?: string;
	/** Animation duration in milliseconds */
	duration?: number;
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
	/** Native `disabled`, read to guard the sound cue. */
	disabled?: boolean;
	/** Native click handler, called after the ripple is created. */
	onclick?: (event: MouseEvent) => void;
}

interface Ripple {
	x: number;
	y: number;
	size: number;
	key: number;
}
</script>

<script setup lang="ts">
import { ref, useAttrs, useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import { sound as soundFx } from "../../sound/sound.js";

defineOptions({ name: "RippleButton", inheritAttrs: false });

const {
	class: className,
	rippleColor = "#ADD8E6",
	duration = 600,
	sound = false,
	disabled = false,
	onclick,
} = defineProps<RippleButtonProps>();

defineSlots<{ default?: () => unknown }>();

const attrs = useAttrs();

const buttonRef = useTemplateRef<HTMLButtonElement>("buttonRef");
const ripples = ref<Ripple[]>([]);
let nextRippleKey = 0;

function handleClick(event: MouseEvent) {
	if (sound && !disabled) soundFx.play("press");
	createRipple(event);
	if (onclick && typeof onclick === "function") {
		onclick(event);
	}
}

function createRipple(event: MouseEvent) {
	const button = buttonRef.value;
	if (!button) return;

	const rect = button.getBoundingClientRect();
	const size = Math.max(rect.width, rect.height);
	const x = event.clientX - rect.left - size / 2;
	const y = event.clientY - rect.top - size / 2;

	const newRipple: Ripple = { x, y, size, key: nextRippleKey++ };
	ripples.value = [...ripples.value, newRipple];

	setTimeout(() => {
		ripples.value = ripples.value.filter((r) => r.key !== newRipple.key);
	}, duration);
}

// `v-bind="attrs"` stays AFTER `:style` on purpose: the Svelte source binds
// `style={…}` as a plain attribute before `{...restProps}`, so a consumer
// `style` wins there. `mergeProps` keeps that winner on a conflicting key
// while still keeping the component's other custom properties.
</script>

<template>
	<button
		ref="buttonRef"
		:class="
			cn(
				'relative flex cursor-pointer items-center justify-center overflow-hidden',
				'bg-background text-primary rounded-lg border-2 px-4 py-2 text-center',
				className
			)
		"
		:style="{ '--ripple-duration': `${duration}ms` }"
		:disabled="disabled"
		@click="handleClick"
		v-bind="attrs"
	>
		<div class="relative z-10">
			<slot></slot>
		</div>

		<span class="pointer-events-none absolute inset-0">
			<span
				v-for="ripple in ripples"
				:key="ripple.key"
				class="ripple-animation absolute rounded-full opacity-30"
				:style="{
					width: `${ripple.size}px`,
					height: `${ripple.size}px`,
					top: `${ripple.y}px`,
					left: `${ripple.x}px`,
					backgroundColor: rippleColor,
				}"
			></span>
		</span>
	</button>
</template>

<style scoped>
@keyframes rippling {
	0% {
		transform: scale(0);
		opacity: 0.3;
	}
	100% {
		transform: scale(2);
		opacity: 0;
	}
}

.ripple-animation {
	animation: rippling var(--ripple-duration, 600ms) ease-out forwards;
}
</style>
