import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "../../utils.js";
import { useSkin } from "../context.js";
import type { PartState } from "../types.js";

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> {
	error?: boolean;
	demoState?: PartState;
	className?: string;
	value?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
	{ error = false, demoState, className, ...rest },
	ref
) {
	const ctx = useSkin();
	const parts = ctx.skin.recipes.textarea({ state: demoState });

	return (
		<textarea ref={ref} className={cn(parts.root, className)} aria-invalid={error} {...rest} />
	);
});
