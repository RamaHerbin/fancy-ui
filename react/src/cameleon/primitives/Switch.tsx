import { forwardRef, useState, type ButtonHTMLAttributes, type MouseEvent } from "react";
import { cn } from "../../utils.js";
import { useSkin } from "../context.js";
import type { PartState } from "../types.js";

export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
	checked?: boolean;
	error?: boolean;
	demoState?: PartState;
	className?: string;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
	{ checked, error = false, disabled = false, demoState, className, onClick, ...rest },
	ref
) {
	const ctx = useSkin();
	const parts = ctx.skin.recipes.switch({ state: demoState });

	// Uncontrolled by default (mirrors the Svelte $bindable(false) local-state
	// behavior): clicking flips it even with no parent wired up. Passing
	// `checked` switches it to a standard React controlled component, where the
	// parent owns the value and `onClick` is how it learns about a flip — the
	// role Svelte's two-way `bind:checked` plays on the source side.
	const [uncontrolledChecked, setUncontrolledChecked] = useState(false);
	const isControlled = checked !== undefined;
	const isChecked = isControlled ? checked : uncontrolledChecked;

	return (
		<button
			ref={ref}
			type="button"
			role="switch"
			aria-checked={isChecked}
			aria-invalid={error}
			disabled={disabled}
			onClick={(event: MouseEvent<HTMLButtonElement>) => {
				if (!isControlled) setUncontrolledChecked((c) => !c);
				onClick?.(event);
			}}
			className={cn(parts.root, className)}
			{...rest}
		>
			<span className={parts.thumb} />
		</button>
	);
});
