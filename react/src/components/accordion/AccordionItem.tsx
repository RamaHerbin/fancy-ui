import { forwardRef, useContext } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "../../utils.js";
import { COLLAPSIBLE_KEY } from "../collapsible/types.js";
import type { CollapsibleContext } from "../collapsible/types.js";
import { ACCORDION_ITEM_KEY, ACCORDION_KEY } from "./types.js";
import type { AccordionItemContext } from "./types.js";

interface AccordionItemOwnProps {
	/** This item's value: what `Accordion`'s `value` holds while it is open. */
	value: string;
	/** Disables just this item. Its trigger is skipped by the arrow keys. */
	disabled?: boolean;
	/** An `AccordionTrigger` and an `AccordionContent`. */
	children?: ReactNode;
	/** Additional CSS classes. */
	className?: string;
}

/** Native `<div>` attributes and listeners are forwarded to the item. */
export interface AccordionItemProps
	extends
		Omit<ComponentPropsWithoutRef<"div">, keyof AccordionItemOwnProps>,
		AccordionItemOwnProps {}

/**
 * One item of an `Accordion`. It is a collapsible whose open state belongs to
 * the accordion: the trigger and the region below it read the context it
 * publishes exactly as they would a `Collapsible` root's. The element arrives
 * through the ref channel rather than a `ref` prop, per PORTING.md.
 */
export const AccordionItem = forwardRef<HTMLDivElement, AccordionItemProps>(
	({ value, disabled = false, children, className, ...rest }, forwardedRef) => {
		// Undefined outside an Accordion: the item then behaves as a closed,
		// standalone collapsible instead of throwing.
		const root = useContext(ACCORDION_KEY);

		const isOpen = root?.isOpen(value) ?? false;
		const isDisabled = (root?.disabled ?? false) || disabled;

		const itemContext: AccordionItemContext = { value, disabled: isDisabled };

		const collapsible: CollapsibleContext = {
			open: isOpen,
			disabled: isDisabled,
			toggle() {
				if (isDisabled) return;
				root?.toggle(value);
			},
			triggerId: root?.triggerId(value) ?? `ft-accordion-trigger-${value}`,
			contentId: root?.contentId(value) ?? `ft-accordion-content-${value}`,
		};

		return (
			<ACCORDION_ITEM_KEY.Provider value={itemContext}>
				<COLLAPSIBLE_KEY.Provider value={collapsible}>
					<div
						{...rest}
						ref={forwardedRef}
						className={cn("ft-accordion-item border-border border-b", className)}
						data-state={isOpen ? "open" : "closed"}
						data-orientation={root?.orientation ?? "vertical"}
						data-disabled={isDisabled ? "" : undefined}
					>
						{children}
					</div>
				</COLLAPSIBLE_KEY.Provider>
			</ACCORDION_ITEM_KEY.Provider>
		);
	}
);
AccordionItem.displayName = "AccordionItem";
