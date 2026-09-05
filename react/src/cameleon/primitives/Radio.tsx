import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../utils.js";
import { useSkin } from "../context.js";
import type { PartState } from "../types.js";

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "type"> {
	/** The currently selected value across this radio's group, if controlled. */
	group?: string;
	value?: string;
	error?: boolean;
	demoState?: PartState;
	className?: string;
	children?: ReactNode;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
	{ group, value, name, error = false, demoState, className, children, ...rest },
	ref
) {
	const ctx = useSkin();
	const parts = ctx.skin.recipes.radio({ state: demoState });

	return (
		<label className={cn(parts.root, className)}>
			{/* radio invalidity belongs on the group, not the input; drive the demo
			    error visual off a data-attribute so we don't misuse aria-invalid.
			    name defaults to the group so same-group radios stay mutually exclusive
			    natively even when the parent doesn't pass a shared `group` value. */}
			<input
				type="radio"
				className="peer sr-only"
				ref={ref}
				name={name ?? group}
				value={value}
				checked={group !== undefined ? group === value : undefined}
				data-invalid={error ? "true" : undefined}
				{...rest}
			/>
			<span className={parts.box} />
			{children}
		</label>
	);
});
