import { forwardRef, useContext } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "../../utils.js";
import { CollapsibleContent } from "../collapsible/CollapsibleContent.js";
import { COLLAPSIBLE_KEY } from "../collapsible/types.js";

interface AccordionContentOwnProps {
	/**
	 * Keeps the children mounted while the item is closed. On by default; pass
	 * `false` to unmount them once the collapse has finished and mount them
	 * again on open. Defaults to `true`, as on `CollapsibleContent`: the trigger's `aria-controls` always points at an element that exists, the closed markup is server-rendered, and nothing has to be measured.
	 * See `CollapsibleContent`.
	 */
	forceMount?: boolean;
	/** The item's content. */
	children?: ReactNode;
	/** Additional CSS classes, merged onto the inner body so padding collapses with the panel. */
	className?: string;
}

/**
 * Native `<div>` attributes and listeners are forwarded to the region; `id`,
 * `role`, `aria-labelledby` and `data-state` stay the component's.
 */
export interface AccordionContentProps
	extends
		Omit<ComponentPropsWithoutRef<"div">, keyof AccordionContentOwnProps>,
		AccordionContentOwnProps {}

/**
 * The labelled region of an `AccordionItem`. The element arrives through the
 * ref channel rather than a `ref` prop, per PORTING.md.
 */
export const AccordionContent = forwardRef<HTMLDivElement, AccordionContentProps>(
	({ forceMount, children, className, ...rest }, forwardedRef) => {
		// The item's collapsible context names the trigger that labels this region.
		const context = useContext(COLLAPSIBLE_KEY);

		return (
			<CollapsibleContent
				{...rest}
				ref={forwardedRef}
				forceMount={forceMount}
				className={cn("ft-accordion-content text-muted-foreground pb-4 text-sm", className)}
				role="region"
				aria-labelledby={context?.triggerId}
			>
				{children}
			</CollapsibleContent>
		);
	}
);
AccordionContent.displayName = "AccordionContent";
