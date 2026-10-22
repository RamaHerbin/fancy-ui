<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { Options as ConfettiOptions } from "canvas-confetti";

export interface ConfettiButtonProps {
	/** Confetti options for this button, merged over the surrounding root's options. */
	options?: ConfettiOptions;
	/**
	 * Plays the `hover` cue on mouse/pen pointer enter and the `press` cue on
	 * click. Off by default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
	/** Custom CSS class */
	class?: HTMLAttributes["class"];
	/** Native `disabled`, read to guard the burst and the consumer callback. */
	disabled?: boolean;
	/** Native click handler, kept as a prop and re-dispatched after the burst. */
	onClick?: ((event: MouseEvent) => void) | ((event: MouseEvent) => void)[];
}
</script>

<script setup lang="ts">
import { useAttrs, useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import confetti from "canvas-confetti";
import { sound as soundFx } from "../../sound/sound.js";
import { useSoundFeedback } from "../../sound/use-sound-feedback.js";
import { callListener } from "../../internals/call-listener.js";
import { CONFETTI_CONTEXT } from "./context.js";

defineOptions({ name: "ConfettiButton", inheritAttrs: false });

defineSlots<{ default?: () => unknown }>();

const {
	options = {},
	sound = false,
	class: className,
	disabled = false,
	onClick,
} = defineProps<ConfettiButtonProps>();

const attrs = useAttrs();

const confettiContext = CONFETTI_CONTEXT.useOptional();
const el = useTemplateRef<HTMLButtonElement>("el");

// Hover cue for mouse/pen pointers only. `on: {}` binds nothing when sound is
// off (and never the default click → press, which `handleClick` already plays).
useSoundFeedback(el, () => ({
	on: sound ? { pointerenter: "hover" as const } : ({} as Record<string, never>),
	disabled,
}));

// `onClick` is a declared prop (so `@click` and `attrs: { onClick }` both land
// here); a function or an array of functions is dispatched once each.
function handleClick(event: MouseEvent) {
	if (disabled) return;
	if (sound) soundFx.play("press");

	const target = event.currentTarget as HTMLElement;
	const rect = target.getBoundingClientRect();
	const x = rect.left + rect.width / 2;
	const y = rect.top + rect.height / 2;

	const origin = {
		x: x / window.innerWidth,
		y: y / window.innerHeight,
	};

	if (confettiContext) {
		confettiContext.fire({ ...options, origin });
	} else {
		confetti({ ...options, origin });
	}
	callListener(onClick, event);
}
</script>

<!--
  `type="button"` is the default so the control never submits a surrounding
  form; `v-bind="attrs"` comes after it, so a consumer `type` wins. The click
  handler is bound after `v-bind`, so nothing in `attrs` can replace it.
-->
<template>
	<button
		ref="el"
		:class="cn(className)"
		type="button"
		:disabled="disabled"
		v-bind="attrs"
		@click="handleClick"
	>
		<slot v-if="$slots.default" />
	</button>
</template>
