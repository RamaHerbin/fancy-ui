import { forwardRef } from "react";
import type { ReactNode } from "react";
import { cn } from "../../utils.js";
import "./navbar.css";

export interface NavbarProps {
	/** Accessible name for the `<nav>` landmark. Defaults to `"Main"`. */
	label?: string;
	/** Pins the bar to the viewport top with `position: sticky` and a translucent, blurred background. */
	sticky?: boolean;
	/** Draws a 1px hairline along the bottom edge. Defaults to `true`. */
	bordered?: boolean;
	/** The brand mark / wordmark, on the left. */
	brand?: ReactNode;
	/** The navigation links, between the brand and the actions. */
	children?: ReactNode;
	/** Actions on the right — search, sign-in, a theme switch. */
	actions?: ReactNode;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Site-level navigation bar: brand on the left, links in the middle, actions
 * on the right.
 *
 * The root element arrives through the ref channel rather than a `ref` prop,
 * per PORTING.md — the Svelte source declares `ref = $bindable(null)`.
 */
export const Navbar = forwardRef<HTMLElement, NavbarProps>(
	({ label = "Main", sticky = false, bordered = true, brand, children, actions, className }, ref) => {
		const classes = cn(
			"ft-navbar flex h-[52px] w-full items-center gap-5 bg-background px-5",
			bordered && "border-border border-b",
			// A translucent fill instead of the opaque default: content scrolling
			// underneath the pinned bar stays legible through the blur rather than
			// vanishing behind a flat panel.
			sticky && "sticky top-0 z-40 bg-background/80 backdrop-blur-md",
			className
		);

		return (
			<nav ref={ref} aria-label={label} className={classes}>
				{brand ? (
					<div className="ft-navbar-brand flex shrink-0 items-center gap-2 text-sm font-bold">
						{brand}
					</div>
				) : null}
				{children ? (
					<div className="flex min-w-0 items-center gap-5">{children}</div>
				) : null}
				{actions ? (
					<div className="ft-navbar-actions ml-auto flex shrink-0 items-center gap-3">
						{actions}
					</div>
				) : null}
			</nav>
		);
	}
);

Navbar.displayName = "Navbar";
