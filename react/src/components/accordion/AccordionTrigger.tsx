import { forwardRef, useContext } from "react";
import type { ComponentPropsWithoutRef, KeyboardEvent, ReactNode } from "react";
import { cn } from "../../utils.js";
import { CollapsibleTrigger } from "../collapsible/CollapsibleTrigger.js";
import { ACCORDION_ITEM_KEY, ACCORDION_KEY } from "./types.js";

interface AccordionTriggerOwnProps {
	/** The level of the heading that wraps the button, 1 to 6. Defaults to 3. */
	headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
	/** Disables this trigger on top of its item's and the accordion's `disabled`. */
	disabled?: boolean;
	/** The trigger's label. */
	children?: ReactNode;
	/** Additional CSS classes, merged onto the button. */
	className?: string;
}

/**
 * Native `<button>` attributes and listeners are forwarded to the button; `id`,
 * `type`, `aria-expanded`, `aria-controls` and `data-state` stay the component's.
 */
export interface AccordionTriggerProps
	extends
		Omit<ComponentPropsWithoutRef<"button">, keyof AccordionTriggerOwnProps>,
		AccordionTriggerOwnProps {}

/**
 * The button that opens an `AccordionItem`, inside a heading. Arrow keys,
 * Home and End move focus between the accordion's triggers. The element
 * arrives through the ref channel rather than a `ref` prop, per PORTING.md.
 */
export const AccordionTrigger = forwardRef<HTMLButtonElement, AccordionTriggerProps>(
	(
		{ headingLevel = 3, disabled = false, children, className, onKeyDown, ...rest },
		forwardedRef
	) => {
		const root = useContext(ACCORDION_KEY);
		const item = useContext(ACCORDION_ITEM_KEY);

		// A single accordion that may not collapse keeps its open item open. The
		// button stays focusable (so it is not `disabled`) and says so to assistive
		// technology instead.
		const locked = item && root ? root.isLocked(item.value) : false;

		// Runs the navigation first, then hands the SAME event to the consumer. A
		// disabled trigger gets no key events from a real browser; the guard
		// covers a synthetic one, and keeps it away from the consumer too.
		function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
			if (item?.disabled || disabled) return;
			if (root?.navigate(event.currentTarget, event.key)) event.preventDefault();
			onKeyDown?.(event);
		}

		return (
			<div role="heading" aria-level={headingLevel} className="ft-accordion-header m-0 flex">
				<CollapsibleTrigger
					{...rest}
					ref={forwardedRef}
					disabled={disabled}
					className={cn(
						"ft-accordion-trigger flex flex-1 items-center justify-between gap-4 py-4 text-left text-sm font-medium",
						"hover:underline",
						"[&[data-state=open]>svg]:rotate-180",
						className
					)}
					data-ft-accordion-trigger=""
					aria-disabled={locked ? "true" : rest["aria-disabled"]}
					onKeyDown={handleKeyDown}
				>
					{children}
					<svg
						className="ft-accordion-chevron text-muted-foreground size-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none"
						viewBox="0 0 16 16"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
						focusable="false"
					>
						<path d="m4 6 4 4 4-4" />
					</svg>
				</CollapsibleTrigger>
			</div>
		);
	}
);
AccordionTrigger.displayName = "AccordionTrigger";
