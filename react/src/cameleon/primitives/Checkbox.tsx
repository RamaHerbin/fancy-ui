import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../utils.js";
import { useSkin } from "../context.js";
import type { PartState } from "../types.js";

export interface CheckboxProps
	extends Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "type"> {
	checked?: boolean;
	error?: boolean;
	demoState?: PartState;
	className?: string;
	children?: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
	{ checked, error = false, demoState, className, children, ...rest },
	ref
) {
	const ctx = useSkin();
	const parts = ctx.skin.recipes.checkbox({ state: demoState });

	return (
		<label className={cn(parts.root, className)}>
			<input
				type="checkbox"
				className="peer sr-only"
				ref={ref}
				checked={checked}
				aria-invalid={error}
				{...rest}
			/>
			<span className={parts.box}>
				<svg
					width="12"
					height="12"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="3.5"
					aria-hidden="true"
				>
					<path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			</span>
			{children}
		</label>
	);
});
