<script lang="ts">
import type { HTMLAttributes } from "vue";

export type BadgeVariant = "default" | "secondary" | "outline" | "destructive" | "success";
export type BadgeSize = "sm" | "md";

export interface BadgeProps {
	/** Visual treatment. Always pair it with a visible word: colour is never the message. */
	variant?: BadgeVariant;
	/** Compact (`sm`) or regular (`md`). */
	size?: BadgeSize;
	/** Additional CSS classes. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from "vue";
import { cn } from "../../utils.js";

defineOptions({ name: "Badge", inheritAttrs: false });

const { variant = "default", size = "md", class: className } = defineProps<BadgeProps>();

// The source's `children` snippet. Plain, unparameterised content.
defineSlots<{ default?: () => unknown }>();

const attrs = useAttrs();

// Every variant carries a border (transparent where it has no outline) so
// they all share one height.
const VARIANT_CLASSES: Record<BadgeVariant, string> = {
	default: "border-transparent bg-primary text-primary-foreground",
	secondary: "border-transparent bg-secondary text-secondary-foreground",
	outline: "border-border text-foreground",
	destructive: "border-destructive/35 bg-destructive/10 text-destructive-foreground-soft",
	success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
	sm: "px-1.5 py-px text-[0.6875rem] leading-4",
	md: "px-2 py-0.5 text-xs leading-4",
};

const classes = computed(() =>
	cn(
		"inline-flex items-center gap-1 rounded-full border font-medium whitespace-nowrap",
		SIZE_CLASSES[size],
		VARIANT_CLASSES[variant],
		className
	)
);
</script>

<template>
	<span v-bind="attrs" :class="classes" :data-variant="variant" :data-size="size">
		<slot />
	</span>
</template>
