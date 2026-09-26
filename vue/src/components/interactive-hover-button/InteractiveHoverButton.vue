<script lang="ts">
import type { ButtonHTMLAttributes, HTMLAttributes } from "vue";

export interface InteractiveHoverButtonProps {
	/** Button label text */
	text?: string;
	/** Custom CSS class */
	class?: HTMLAttributes["class"];
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
	/** Native disabled state — read by the click handler to gate the cue. */
	disabled?: ButtonHTMLAttributes["disabled"];
	onclick?: (event: MouseEvent) => void;
}
</script>

<script setup lang="ts">
import { useAttrs } from "vue";
import { cn } from "../../utils.js";
import { useSoundCue } from "../../sound/index.js";

defineOptions({ name: "InteractiveHoverButton", inheritAttrs: false });

const props = withDefaults(defineProps<InteractiveHoverButtonProps>(), {
	text: "Button",
	sound: false,
});

const attrs = useAttrs();

const playCue = useSoundCue(() => props.sound);

function handleClick(event: MouseEvent) {
	if (!props.disabled) playCue("press");
	props.onclick?.(event);
}
</script>

<template>
	<!--
		Every `transition-*` utility below is prefixed `motion-safe:`, which Tailwind
		compiles to `@media (prefers-reduced-motion: no-preference)`. The
		`group-hover:` transforms are deliberately left unprefixed: a visitor who
		asked for less motion still gets the whole hover state, it simply arrives
		instead of travelling. Gating the transforms too would leave the button
		looking broken on hover rather than calm.
	-->
	<button
		:class="
			cn(
				'group bg-background relative w-auto cursor-pointer overflow-hidden rounded-full border p-2 px-6 text-center font-semibold',
				props.class
			)
		"
		:disabled="disabled"
		@click="handleClick"
		v-bind="attrs"
	>
		<div class="flex items-center gap-2">
			<div
				class="bg-primary size-2 rounded-lg group-hover:scale-[100.8] motion-safe:transition-all motion-safe:duration-300"
			></div>
			<span
				class="inline-block group-hover:translate-x-12 group-hover:opacity-0 motion-safe:transition-all motion-safe:duration-300"
			>
				<slot>{{ text }}</slot>
			</span>
		</div>

		<div
			aria-hidden="true"
			class="text-primary-foreground absolute top-0 z-10 flex size-full translate-x-12 items-center justify-center gap-2 opacity-0 group-hover:-translate-x-5 group-hover:opacity-100 motion-safe:transition-all motion-safe:duration-300"
		>
			<span>
				<slot>{{ text }}</slot>
			</span>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M5 12h14" />
				<path d="m12 5 7 7-7 7" />
			</svg>
		</div>
	</button>
</template>
