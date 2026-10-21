import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../../utils.js";

export type BadgeVariant = "default" | "secondary" | "outline" | "destructive" | "success";
export type BadgeSize = "sm" | "md";

/**
 * `BadgeProps` plus every native attribute and listener of the `<span>` it
 * renders. Own props win.
 */
export interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
	/** Visual treatment. Always pair it with a visible word: colour is never the message. */
	variant?: BadgeVariant;
	/** Compact (`sm`) or regular (`md`). */
	size?: BadgeSize;
	/** The label. */
	children?: ReactNode;
	/** Additional CSS classes. */
	className?: string;
}

// Every variant carries a border (transparent where it has no outline) so
// they all share one height.
const VARIANT_CLASSES: Record<BadgeVariant, string> = {
	default: "border-transparent bg-primary text-primary-foreground",
	secondary: "border-transparent bg-secondary text-secondary-foreground",
	outline: "border-border text-foreground",
	destructive: "border-destructive/35 bg-destructive/10 text-destructive",
	success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
	sm: "px-1.5 py-px text-[0.6875rem] leading-4",
	md: "px-2 py-0.5 text-xs leading-4",
};

export function Badge({
	variant = "default",
	size = "md",
	children,
	className,
	...restProps
}: BadgeProps) {
	return (
		<span
			{...restProps}
			className={cn(
				"inline-flex items-center gap-1 rounded-full border font-medium whitespace-nowrap",
				SIZE_CLASSES[size],
				VARIANT_CLASSES[variant],
				className
			)}
			data-variant={variant}
			data-size={size}
		>
			{children}
		</span>
	);
}
