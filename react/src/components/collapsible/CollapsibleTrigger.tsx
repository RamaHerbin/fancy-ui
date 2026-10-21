import { forwardRef, useContext } from "react";
import type { ComponentPropsWithoutRef, MouseEvent, ReactNode } from "react";
import { cn } from "../../utils.js";
import { COLLAPSIBLE_KEY } from "./types.js";

interface CollapsibleTriggerOwnProps {
	/** Disables this trigger on top of the root's own `disabled`. */
	disabled?: boolean;
	/** The trigger's content. */
	children?: ReactNode;
	/** Additional CSS classes. */
	className?: string;
}

/**
 * Native `<button>` attributes and listeners are forwarded; `id`, `type`,
 * `aria-expanded`, `aria-controls` and `data-state` stay the component's.
 */
export interface CollapsibleTriggerProps
	extends
		Omit<ComponentPropsWithoutRef<"button">, keyof CollapsibleTriggerOwnProps>,
		CollapsibleTriggerOwnProps {}

/**
 * The button that toggles a `Collapsible`. The element arrives through the ref
 * channel rather than a `ref` prop, per PORTING.md.
 */
export const CollapsibleTrigger = forwardRef<HTMLButtonElement, CollapsibleTriggerProps>(
	({ disabled = false, children, className, onClick, ...rest }, forwardedRef) => {
		// Undefined outside a Collapsible: the trigger then has nothing to toggle
		// and renders as a plain button rather than throwing.
		const context = useContext(COLLAPSIBLE_KEY);

		const isDisabled = disabled || (context?.disabled ?? false);
		const isOpen = context?.open ?? false;

		// The native `disabled` attribute is the real gate, but a synthetic click
		// fired straight at the element walks past it, so the handler repeats the
		// guard. A guarded click reaches neither the toggle nor the consumer.
		function handleClick(event: MouseEvent<HTMLButtonElement>) {
			if (isDisabled) return;
			context?.toggle();
			onClick?.(event);
		}

		return (
			<button
				{...rest}
				ref={forwardedRef}
				type="button"
				id={context?.triggerId ?? rest.id}
				className={cn(
					"ft-collapsible-trigger cursor-pointer",
					"focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
					"disabled:cursor-not-allowed disabled:opacity-50",
					className
				)}
				disabled={isDisabled}
				aria-expanded={context ? isOpen : rest["aria-expanded"]}
				aria-controls={context?.contentId ?? rest["aria-controls"]}
				data-state={context ? (isOpen ? "open" : "closed") : undefined}
				data-disabled={isDisabled ? "" : undefined}
				onClick={handleClick}
			>
				{children}
			</button>
		);
	}
);
CollapsibleTrigger.displayName = "CollapsibleTrigger";
