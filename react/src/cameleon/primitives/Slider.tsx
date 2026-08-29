import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../../utils.js";
import { useSkin } from "../context.js";

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "type"> {
	error?: boolean;
	className?: string;
	value?: number;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(function Slider(
	{ error = false, className, ...rest },
	ref
) {
	const ctx = useSkin();
	const parts = ctx.skin.recipes.slider({ state: error ? "error" : undefined });

	return (
		<input
			type="range"
			ref={ref}
			className={cn(parts.root, className)}
			aria-invalid={error || undefined}
			{...rest}
		/>
	);
});
