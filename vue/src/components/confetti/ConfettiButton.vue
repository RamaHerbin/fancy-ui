<script lang="ts">
import type { Options as ConfettiOptions } from "canvas-confetti";

export interface ConfettiButtonProps {
	/** Confetti options for this button, merged over the surrounding root's options. */
	options?: ConfettiOptions;
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}
</script>

<script setup lang="ts">
import confetti from "canvas-confetti";
import { sound as soundFx } from "../../sound/sound.js";
import { CONFETTI_CONTEXT } from "./context.js";

defineOptions({ name: "ConfettiButton", inheritAttrs: false });

defineSlots<{ default?: () => unknown }>();

const { options = {}, sound = false } = defineProps<ConfettiButtonProps>();

const confettiContext = CONFETTI_CONTEXT.useOptional();

function handleClick(event: MouseEvent) {
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
}
</script>

<!--
  `type="button"` is an upstream fix (the Svelte source renders a bare
  `<button>`): without it the control defaults to `submit` inside a form, and
  `inheritAttrs: false` leaves consumers no way to override it.
-->
<template>
	<button type="button" @click="handleClick">
		<slot v-if="$slots.default" />
	</button>
</template>
