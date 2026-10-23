import { forwardRef, useContext, useEffect } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { MAGNETIC_FIELD_KEY } from "./types.js";
import "./magnetic-field.css";

export interface MagneticItemOwnProps {
	/** How heavy the item is. Above 1 it moves and leans less and settles more slowly; below 1 it is livelier. */
	mass?: number;
	/** Per-item pull multiplier, applied on top of the field's `strength`. */
	strength?: number;
	/** Whether the item moves toward the magnet. */
	pull?: boolean;
	/** Whether the item leans toward the magnet. */
	rotate?: boolean;
	/** Renders `<span>` wrappers with `display: inline-block` instead of block `<div>`s, for items that sit inside a line of text or an inline row. */
	inline?: boolean;
	/** The element that reacts. */
	children?: ReactNode;
	/** Additional CSS classes, on the static outer wrapper. */
	className?: string;
}

/** Native attributes and listeners are forwarded to the static outer wrapper. */
export interface MagneticItemProps
	extends MagneticItemOwnProps, Omit<HTMLAttributes<HTMLElement>, keyof MagneticItemOwnProps> {}

export const MagneticItem = forwardRef<HTMLElement, MagneticItemProps>(function MagneticItem(
	{
		mass = 1,
		strength = 1,
		pull = true,
		rotate = true,
		inline = false,
		children,
		className,
		...rest
	},
	forwardedRef
) {
	// Undefined outside a MagneticField: the item then renders the same markup
	// and simply never moves.
	const ctx = useContext(MAGNETIC_FIELD_KEY);

	const [outer, outerRef] = useElementRef<HTMLElement>();
	const [inner, innerRef] = useElementRef<HTMLElement>();
	const composedOuterRef = useComposedRefs<HTMLElement>(forwardedRef, outerRef);

	const optionsRef = useLiveRef({ mass, strength, pull, rotate });

	useEffect(() => {
		if (!ctx || !outer || !inner) return;
		return ctx.register(outer, inner, optionsRef.current);
	}, [ctx, outer, inner, optionsRef]);

	useEffect(() => {
		if (ctx && outer) ctx.updateItem(outer, { mass, strength, pull, rotate });
	}, [ctx, outer, mass, strength, pull, rotate]);

	const Tag = inline ? "span" : "div";

	return (
		<Tag
			ref={composedOuterRef}
			className={cn("ft-magnetic-item", className)}
			{...rest}
			data-inline={inline || undefined}
		>
			<Tag ref={innerRef} className="ft-magnetic-item-inner">
				{children}
			</Tag>
		</Tag>
	);
});
