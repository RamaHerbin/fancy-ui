<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	export type BadgeVariant = "default" | "secondary" | "outline" | "destructive" | "success";
	export type BadgeSize = "sm" | "md";

	export interface BadgeProps {
		/** Visual treatment. Always pair it with a visible word: colour is never the message. */
		variant?: BadgeVariant;
		/** Compact (`sm`) or regular (`md`). */
		size?: BadgeSize;
		/** The label. */
		children?: Snippet;
		/** Additional CSS classes. */
		class?: string;
	}

	/**
	 * `BadgeProps` plus every native attribute and listener of the `<span>` it
	 * renders. Own props win.
	 */
	export type BadgeAttributes = BadgeProps &
		Omit<HTMLAttributes<HTMLSpanElement>, keyof BadgeProps>;
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let {
		variant = "default",
		size = "md",
		children,
		class: className,
		...restProps
	}: BadgeAttributes = $props();

	// Every variant carries a border (transparent where it has no outline) so
	// they all share one height.
	const VARIANT_CLASSES: Record<BadgeVariant, string> = {
		default: "border-transparent bg-primary text-primary-foreground",
		secondary: "border-transparent bg-secondary text-secondary-foreground",
		outline: "border-border text-foreground",
		destructive:
			"border-destructive/35 bg-destructive/10 text-[oklch(0.48_0.21_27.325)] dark:text-destructive",
		success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
	};

	const SIZE_CLASSES: Record<BadgeSize, string> = {
		sm: "px-1.5 py-px text-[0.6875rem] leading-4",
		md: "px-2 py-0.5 text-xs leading-4",
	};

	const classes = $derived(
		cn(
			"inline-flex items-center gap-1 rounded-full border font-medium whitespace-nowrap",
			SIZE_CLASSES[size],
			VARIANT_CLASSES[variant],
			className
		)
	);
</script>

<span {...restProps} class={classes} data-variant={variant} data-size={size}>
	{@render children?.()}
</span>
