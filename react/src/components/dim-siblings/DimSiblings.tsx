import { createElement, forwardRef, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "../../utils.js";
import "./dim-siblings.css";

/**
 * Props for DimSiblings.
 *
 * DimSiblings is the one component in this collection with zero JavaScript
 * behaviour: it renders a wrapper and three CSS custom properties, and a
 * pure `:has()` stylesheet does the rest (hover/focus one direct child,
 * dim or blur every other one). There is no pointer tracking to clean up
 * and nothing to gate behind SSR, because there is nothing here that only
 * runs in the browser.
 */
export interface DimSiblingsProps extends Omit<HTMLAttributes<HTMLElement>, "className"> {
	/** Additional CSS classes. */
	className?: string;
	/** Which visual property the non-active siblings lose. */
	effect?: "dim" | "blur" | "both";
	/** Opacity the non-active siblings settle to. A floor, not zero — full
	 * transparency reads as "the card vanished", not "the card is quiet". */
	opacity?: number;
	/** Blur radius, in px, applied only when `effect` includes blur. */
	blur?: number;
	/** Transition duration, in ms, for both the opacity and (if active) the blur. */
	duration?: number;
	/** The rendered root element — `"ul"`/`"ol"` for a list of cards whose
	 * CSS list semantics need to survive the wrapper. */
	as?: keyof HTMLElementTagNameMap;
	/** The sibling group. Every direct child participates. */
	children: ReactNode;
}

const DEFAULT_OPACITY = 0.4;
const DEFAULT_DURATION = 150;

export const DimSiblings = forwardRef<HTMLElement, DimSiblingsProps>(function DimSiblings(
	{
		effect = "dim",
		opacity = DEFAULT_OPACITY,
		blur = 2,
		duration = DEFAULT_DURATION,
		as = "div",
		children,
		className,
		style,
		...restProps
	},
	ref
) {
	// Blur is opt-in per `effect`, not per the `blur` prop alone — a caller
	// who leaves `effect="dim"` but tweaks `blur` should not get blur anyway.
	// Baking that choice into the CSS var itself (rather than a second
	// selector keyed off `effect`) keeps the frozen `:has()` rule in the
	// colocated stylesheet at exactly one declaration for hover and one for
	// focus, whatever `effect` resolves to.
	const blurPx = effect === "dim" ? 0 : blur;

	// All three vars are declared unconditionally, `undefined` standing in for
	// "at its default, write nothing". Not just an omission: the key still
	// being present is what stops a caller-supplied `style` from setting the
	// same var behind the component's back, which is exactly what the Svelte
	// source does — a `style:` directive reserves its property name against
	// the spread's style string even when the directive resolves to
	// `undefined`. React skips an `undefined` style value the same way, so the
	// var stays absent from the rendered `style` either way.
	const mergedStyle: CSSProperties = {
		...style,
		["--ft-dimsiblings-opacity" as string]: opacity === DEFAULT_OPACITY ? undefined : opacity,
		["--ft-dimsiblings-blur" as string]: `${blurPx}px`,
		["--ft-dimsiblings-duration" as string]:
			duration === DEFAULT_DURATION ? undefined : `${duration}ms`,
	};

	return createElement(
		as,
		{
			// Attribute order mirrors the Svelte source: `class` first (rest
			// props can never carry it — it is destructured out), then the
			// spread, then the component's own `data-effect` and style vars
			// LAST so they win. A forwarded `data-effect` must not slip past
			// and silently select a different branch of the stylesheet.
			className: cn("ft-dimsiblings", className),
			...restProps,
			"data-effect": effect,
			style: mergedStyle,
			// After the spread for the same reason `bind:this` is a directive
			// on the Svelte side: nothing a caller forwards can drop the ref.
			ref,
		},
		children
	);
});

DimSiblings.displayName = "DimSiblings";
