<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { ButtonVariant, ButtonSize } from "../button/types.js";

/** `"square"` keeps the size's own radius; `"circle"` rounds it fully. */
export type IconButtonShape = "square" | "circle";

export interface IconButtonProps {
	/**
	 * Accessible name. Required, not optional: an icon-only control has no
	 * visible text to fall back on, so without this the control would have
	 * no name at all in the accessibility tree.
	 */
	label: string;
	/** Visual treatment, forwarded to the underlying Button. */
	variant?: ButtonVariant;
	/** Sets the button's square footprint (30 / 36 / 42px) and its resting radius. */
	size?: ButtonSize;
	/** Square keeps the size's own radius; circle rounds it fully. */
	shape?: IconButtonShape;
	/** Native `type`. Ignored once `href` is set — an anchor has no `type`. */
	type?: "button" | "submit" | "reset";
	/** Greys the button out and makes it inert to pointer and keyboard activation. */
	disabled?: boolean;
	/**
	 * Swaps the icon for a spinner and marks the control `aria-busy`, without
	 * dimming it the way `disabled` does. Activation is blocked exactly like
	 * `disabled`.
	 */
	loading?: boolean;
	/** Renders an `<a>` instead of a `<button>` when set. */
	href?: string;
	/** Anchor `target`. `"_blank"` forces a safe `rel` regardless of what `rel` says. */
	target?: string;
	/** Anchor `rel`. Widened, never narrowed — see `target`. */
	rel?: string;
	/** Fires on activation. Never called while `disabled` or `loading`. */
	onclick?: (event: MouseEvent) => void;
	/** Additional CSS classes. */
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
import { Button } from "../button/index.js";

defineOptions({ name: "IconButton", inheritAttrs: false });

const {
	label,
	variant = "outline",
	size = "md",
	shape = "square",
	type = "button",
	disabled = false,
	loading = false,
	href = undefined,
	target = undefined,
	rel = undefined,
	onclick,
	class: className,
	sound = false,
} = defineProps<IconButtonProps>();

defineSlots<{
	/** The icon, rendered centred with no label alongside it. */
	default?: () => unknown;
}>();

// The element Button itself published. Read through Button's own exposed
// `ref` so it tracks the control across a swap between the `<a>` and
// `<button>` branches; `ref` is a reserved vnode key, so it is exposed on the
// instance rather than carried as a prop.
const btn = useTemplateRef<InstanceType<typeof Button>>("btn");
defineExpose({ ref: computed(() => btn.value?.ref ?? null) });

// A fixed square replaces Button's own horizontal padding — an icon-only
// control centres on its glyph rather than growing to fit a label. Each
// size's radius already matches Button's own scale, so only `circle`
// below needs to override it.
const SIZE_CLASSES: Record<ButtonSize, string> = {
	sm: "size-[30px] px-0 py-0",
	md: "size-[36px] px-0 py-0",
	lg: "size-[42px] px-0 py-0",
};

// Ghost reads as more subtle icon-only: with no label to carry visual
// weight, it rests at the muted tone rather than Button's own
// full-strength foreground, and only brightens on hover/focus.
const VARIANT_EXTRA_CLASSES: Partial<Record<ButtonVariant, string>> = {
	ghost: "text-muted-foreground",
};

const classes = computed(() =>
	cn(
		"ft-icon-btn",
		SIZE_CLASSES[size],
		shape === "circle" && "rounded-full",
		VARIANT_EXTRA_CLASSES[variant],
		className
	)
);
</script>

<template>
	<Button
		ref="btn"
		:variant="variant"
		:size="size"
		:type="type"
		:disabled="disabled"
		:loading="loading"
		:href="href"
		:target="target"
		:rel="rel"
		:label="label"
		:onclick="onclick"
		:sound="sound"
		:class="classes"
	>
		<!--
			The icon goes into Button's lead cell, and only when the caller
			actually passed one: Svelte hands `iconStart={children}`, which is
			`undefined` with no children, and Button's own `loading || iconStart`
			gate then keeps an empty lead cell out of the markup. A `<template
			#iconStart>` written unconditionally would always make
			`$slots.iconStart` truthy and defeat that gate.
		-->
		<template v-if="$slots.default" #iconStart><slot /></template>
	</Button>
</template>
