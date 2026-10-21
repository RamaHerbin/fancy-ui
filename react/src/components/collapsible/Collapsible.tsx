import { forwardRef, useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "../../utils.js";
import { useFancyId } from "../../internals/use-id.js";
import { COLLAPSIBLE_KEY } from "./types.js";
import type { CollapsibleContext } from "./types.js";

interface CollapsibleOwnProps {
	/**
	 * Whether the content is expanded. Passing it makes the state controlled, the
	 * React counterpart of the Svelte source's `$bindable`; omit it to let the
	 * root own its state and report every change through `onOpenChange`.
	 */
	open?: boolean;
	/** The state an uncontrolled root starts in. Defaults to `false`. */
	defaultOpen?: boolean;
	/** Called with the new state each time the trigger toggles it. */
	onOpenChange?: (open: boolean) => void;
	/** Makes the trigger inert. A controlled `open` can still be changed from outside. */
	disabled?: boolean;
	/** A `CollapsibleTrigger` and a `CollapsibleContent`. */
	children?: ReactNode;
	/** Additional CSS classes. */
	className?: string;
}

/** Native `<div>` attributes and listeners are forwarded to the root. */
export interface CollapsibleProps
	extends Omit<ComponentPropsWithoutRef<"div">, keyof CollapsibleOwnProps>, CollapsibleOwnProps {}

/**
 * The root of the collapsible compound: it owns the open state and the id pair
 * its trigger and content are wired up with.
 *
 * The element arrives through the ref channel rather than a `ref` prop, per
 * PORTING.md; the Svelte source declares `ref = $bindable(null)`.
 */
export const Collapsible = forwardRef<HTMLDivElement, CollapsibleProps>(
	(
		{
			open: openProp,
			defaultOpen = false,
			onOpenChange,
			disabled = false,
			children,
			className,
			...rest
		},
		forwardedRef
	) => {
		// SSR-stable: `internals/use-id.js`'s `uid()` is client-only, and the
		// trigger/content ids must already agree on the first server-rendered
		// paint so `aria-controls` is correct before hydration.
		const uid = useFancyId();

		// The Svelte source's `open` is `$bindable(false)`: a consumer can bind it
		// or leave it alone and let the component keep its own copy. React has no
		// such channel, so the prop is controlled when it is passed and this local
		// copy takes over when it is not. Either way `onOpenChange` fires.
		const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
		const isControlled = openProp !== undefined;
		const open = isControlled ? openProp : uncontrolledOpen;

		const context: CollapsibleContext = {
			open,
			disabled,
			// The only place the state changes from inside.
			toggle() {
				if (disabled) return;
				const next = !open;
				if (!isControlled) setUncontrolledOpen(next);
				onOpenChange?.(next);
			},
			triggerId: `${uid}-trigger`,
			contentId: `${uid}-content`,
		};

		return (
			<COLLAPSIBLE_KEY.Provider value={context}>
				<div
					{...rest}
					ref={forwardedRef}
					className={cn("ft-collapsible", className)}
					data-state={open ? "open" : "closed"}
					data-disabled={disabled ? "" : undefined}
				>
					{children}
				</div>
			</COLLAPSIBLE_KEY.Provider>
		);
	}
);
Collapsible.displayName = "Collapsible";
