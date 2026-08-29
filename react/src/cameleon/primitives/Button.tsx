import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../utils.js";
import { useSkin } from "../context.js";
import type { RecipeArgs } from "../types.js";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
	variant?: "primary" | "secondary" | "destructive";
	size?: "sm" | "md" | "lg";
	loading?: boolean;
	/** Force a visual state for the /skins state matrix (non-interactive). */
	demoState?: "hover" | "active" | "focus";
	className?: string;
	children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
	{
		variant = "primary",
		size = "md",
		loading = false,
		disabled = false,
		type = "button",
		demoState,
		className,
		children,
		...rest
	},
	ref
) {
	const ctx = useSkin();
	const args: RecipeArgs = {
		variant,
		size,
		state: demoState ?? (loading ? "loading" : disabled ? "disabled" : "default"),
	};
	// Re-derived on every render — this is what makes a live skin switch work.
	const parts = ctx.skin.recipes.button(args);
	const trailing = ctx.skin.ornaments?.buttonTrailing;

	return (
		<button
			ref={ref}
			type={type}
			className={cn("cam-btn", parts.root, className)}
			disabled={disabled || loading}
			data-variant={variant}
			{...rest}
		>
			{parts.label !== undefined ? <span className={parts.label}>{children}</span> : children}
			{trailing ? trailing(args) : null}
		</button>
	);
});
