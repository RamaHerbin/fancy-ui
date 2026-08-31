import { forwardRef, useMemo } from "react";
import type { ReactNode } from "react";
import { cn } from "../../utils.js";
import { BUTTON_GROUP_CONTEXT_KEY } from "./types.js";
import type { ButtonGroupContext, ButtonGroupOrientation } from "./types.js";
import "./button-group.css";

export interface ButtonGroupProps {
	/** Stacking axis for the joined items. Defaults to a row. */
	orientation?: ButtonGroupOrientation;
	/** Accessible name for the group, exposed as `aria-label`. */
	label?: string;
	/** The adjacent actions to join into one seamless control. */
	children?: ReactNode;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Joins a row (or a stack) of adjacent actions into one seamless control.
 *
 * The root element arrives through the ref channel rather than a `ref` prop,
 * per PORTING.md — the Svelte source declares `ref = $bindable(null)`.
 *
 * Rest props are not spread: the Svelte source reads only these props off
 * `$props()` and has no `...restProps`, so the port carries no wider
 * attribute surface than the component it mirrors.
 */
export const ButtonGroup = forwardRef<HTMLDivElement, ButtonGroupProps>(
	({ orientation = "horizontal", label, children, className }, ref) => {
		// Rebuilt only when the orientation actually changes — that rebuild is
		// what re-renders the nested controls reading it, and it is the React
		// counterpart of the Svelte context's live getter.
		const context = useMemo<ButtonGroupContext>(() => ({ orientation }), [orientation]);

		return (
			<BUTTON_GROUP_CONTEXT_KEY.Provider value={context}>
				<div
					ref={ref}
					className={cn(
						"ft-button-group border-border inline-flex rounded-lg border",
						orientation === "vertical" ? "flex-col" : "flex-row",
						className
					)}
					data-orientation={orientation}
					role="group"
					aria-label={label}
				>
					{children}
				</div>
			</BUTTON_GROUP_CONTEXT_KEY.Provider>
		);
	}
);

ButtonGroup.displayName = "ButtonGroup";
