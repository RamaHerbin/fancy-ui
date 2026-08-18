import { forwardRef, type ReactNode, type SelectHTMLAttributes } from "react";
import { cn } from "../../utils.js";
import { useSkin } from "../context.js";
import type { PartState } from "../types.js";

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "className"> {
	error?: boolean;
	demoState?: PartState;
	className?: string;
	value?: string;
	children?: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
	{ error = false, demoState, className, children, ...rest },
	ref
) {
	const ctx = useSkin();
	const parts = ctx.skin.recipes.select({ state: demoState });

	return (
		<div className={cn(parts.root, className)}>
			<select ref={ref} className={parts.field} aria-invalid={error} {...rest}>
				{children}
			</select>
			<span className={parts.chevron} aria-hidden="true">
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2.5"
				>
					<path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			</span>
		</div>
	);
});
