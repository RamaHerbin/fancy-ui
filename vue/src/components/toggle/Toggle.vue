<script lang="ts">
import type { HTMLAttributes } from "vue";

export type ToggleSize = "sm" | "md" | "lg";
export type ToggleVariant = "ghost" | "outline";

export interface ToggleProps {
	/** Disables the toggle; blocks both the state change and the callback */
	disabled?: boolean;
	/** Called with the new pressed state whenever the toggle is activated */
	onPressedChange?: (pressed: boolean) => void;
	/** Visual size of the control */
	size?: ToggleSize;
	/** `"ghost"` has no resting border, `"outline"` keeps one at rest */
	variant?: ToggleVariant;
	/** Accessible name — required when content is icon-only */
	label?: string;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}
</script>

<script setup lang="ts">
import { computed, useTemplateRef } from "vue";

import { cn } from "../../utils.js";
import { sound as soundFx } from "../../sound/sound.js";

defineOptions({ name: "Toggle", inheritAttrs: false });

const props = withDefaults(defineProps<ToggleProps>(), {
	disabled: false,
	size: "md",
	variant: "ghost",
	sound: false,
});

const pressed = defineModel<boolean>("pressed", { default: false });

defineSlots<{
	default?: () => unknown;
}>();

const ref = useTemplateRef<HTMLButtonElement>("ref");
defineExpose({ ref });

const SIZE_CLASSES: Record<ToggleSize, string> = {
	sm: "size-[30px] rounded-[6px] text-xs",
	md: "size-[36px] rounded-[8px] text-sm",
	lg: "size-[42px] rounded-[10px] text-base",
};

const classes = computed(() =>
	cn(
		// No `transition-colors` here: the scoped style block below declares a
		// `transition` shorthand on this same element, and Svelte's scoped CSS
		// is unlayered while Tailwind utilities live in `@layer utilities`, so
		// the utility would have been silently replaced anyway. The colour
		// channel is re-declared by hand there instead.
		"ft-toggle inline-flex shrink-0 cursor-pointer items-center justify-center font-medium",
		"focus-visible:outline-none",
		"disabled:pointer-events-none disabled:opacity-50",
		SIZE_CLASSES[props.size],
		props.variant === "outline" && "border border-border",
		pressed.value
			? "bg-secondary text-secondary-foreground"
			: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
		props.class
	)
);

// The only place `pressed` changes. Never inside a watcher — that would mean
// reading and writing the same state in one pass and would fight a caller's
// own v-model write.
function toggle() {
	if (props.disabled) return;
	const next = !pressed.value;
	pressed.value = next;
	if (props.sound) soundFx.play(next ? "toggle-on" : "toggle-off");
	props.onPressedChange?.(next);
}
</script>

<template>
	<button
		ref="ref"
		type="button"
		:class="classes"
		:aria-pressed="pressed"
		:aria-label="label"
		:disabled="disabled"
		@click="toggle"
	>
		<slot />
	</button>
</template>

<style scoped>
/*
 * The brand accent has no semantic token in the app's theme layer, so it is
 * declared locally with a light-dark() fallback — the same shape the AI
 * family components use for --ft-status-error. A consumer theme can still
 * override it by setting --ft-accent higher up the tree.
 */
.ft-toggle {
	--ft-toggle-accent: var(
		--ft-accent,
		light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
	);
	/* One local alias so the token pair is typed once rather than six times.
	   150ms = tokens.DURATIONS.fast, cubic-bezier(0.4, 0, 0.2, 1) = tokens.EASINGS.inout */
	--ft-toggle-motion: var(--ft-duration-fast, 150ms)
		var(--ft-ease-inout, cubic-bezier(0.4, 0, 0.2, 1));
	/* The pressed ring is painted by an absolutely-positioned pseudo, which
	   needs a containing block. `relative` on an inline-flex button changes
	   no layout. */
	position: relative;
	/* Replaces the `transition-colors` utility removed from the class string
	   above. Colour is a state change, not motion, so it stays outside the
	   reduced-motion query. `text-decoration-color`, `fill` and `stroke`
	   never change on this control, so the three that do are the faithful
	   subset of what the utility covered. */
	transition:
		color var(--ft-toggle-motion),
		background-color var(--ft-toggle-motion),
		border-color var(--ft-toggle-motion);
	/* Kills the ~300ms tap delay without blocking scroll — the same rule,
	   for the same reason, as `.ft-pressable`. */
	touch-action: manipulation;
}

/* Pressed state gets an inset accent ring on top of the secondary surface,
   rather than a plain border, so the active look survives on both the
   ghost and outline variants without fighting their own border.
   It lives on `::before` rather than on the button itself because the
   button's own `box-shadow` is its focus ring: a ring that must never
   animate cannot share a property with a signal that should. Same shadow,
   same inherited radius, one layer down — the resting look is unchanged. */
.ft-toggle::before {
	content: "";
	position: absolute;
	inset: 0;
	border-radius: inherit;
	pointer-events: none;
	box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--ft-toggle-accent) 50%, transparent);
	opacity: 0;
}

.ft-toggle[aria-pressed="true"]::before {
	opacity: 1;
}

/* One rule, not two: with the pressed ring on the pseudo, focus while
   pressed no longer has to spell out both shadows at once — the pseudo
   paints the inset ring and the host paints the focus ring, on separate
   layers that cannot overwrite each other. */
.ft-toggle:focus-visible {
	box-shadow: 0 0 0 3px color-mix(in oklab, var(--ft-toggle-accent) 35%, transparent);
}

/* Universal fallback — press feedback must survive reduced motion, and a UA
   that supports neither query still needs some pressed affordance. */
.ft-toggle:active:not(:disabled) {
	opacity: var(--ft-toggle-press-opacity, 0.85);
}

@media (prefers-reduced-motion: no-preference) {
	.ft-toggle {
		/* The individual `scale` property, not `transform: scale()`: this
		   scoped rule is unlayered, so a `transform` here would beat any
		   transform utility a consumer passes through the public `class`
		   prop — a `rotate-45` would silently vanish, at rest AND under
		   the press. `scale` composes with the consumer's `transform`
		   instead of replacing it. */
		scale: 1;
		transition:
			color var(--ft-toggle-motion),
			background-color var(--ft-toggle-motion),
			border-color var(--ft-toggle-motion),
			scale var(--ft-toggle-motion);
	}

	.ft-toggle:active:not(:disabled) {
		scale: var(--ft-toggle-press-scale, 0.97);
		/* Full motion = scale only; reduced motion = opacity only. Never both. */
		opacity: 1;
	}

	/* A 1px inset ring has no axis to grow along, so only its opacity
	   travels — the signal arrives on the same clock as the colour beside
	   it instead of a frame ahead of it. */
	.ft-toggle::before {
		transition: opacity var(--ft-toggle-signal-duration, var(--ft-duration-fast, 150ms))
			var(--ft-ease-inout, cubic-bezier(0.4, 0, 0.2, 1));
	}
}
</style>
