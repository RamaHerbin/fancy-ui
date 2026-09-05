import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../../utils.js";
import { useSkin } from "../context.js";
import type { PartState } from "../types.js";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
	error?: boolean;
	/** Force a visual state for the /skins state matrix. */
	demoState?: PartState;
	className?: string;
	value?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
	{ error = false, demoState, className, ...rest },
	ref
) {
	const ctx = useSkin();
	const parts = ctx.skin.recipes.input({ state: demoState });

	return <input ref={ref} className={cn(parts.root, className)} aria-invalid={error} {...rest} />;
});
