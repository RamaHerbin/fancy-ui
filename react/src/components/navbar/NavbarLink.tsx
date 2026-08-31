import { forwardRef } from "react";
import type { MouseEvent, ReactNode } from "react";
import { cn } from "../../utils.js";
import "./navbar-link.css";

export interface NavbarLinkProps {
	/** Destination URL. */
	href: string;
	/**
	 * Marks this as the page the visitor is already on: `aria-current="page"`
	 * plus a visible weight/colour change and an accent underline — current
	 * is never conveyed by colour alone.
	 */
	current?: boolean;
	/**
	 * Opens the link in a new tab with a safe `rel`, and appends a
	 * visually-hidden "(opens in a new tab)" note to the accessible name.
	 */
	external?: boolean;
	/** Strips the link out of the click and keyboard-activation paths. */
	disabled?: boolean;
	/** Native click handler. Never called while `disabled`. */
	onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
	/** The link's label. */
	children?: ReactNode;
	/** Additional CSS classes */
	className?: string;
}

/**
 * A single navigation link, standalone enough to render anywhere — a mobile
 * menu, a footer — not only as a `Navbar` descendant.
 *
 * The root element arrives through the ref channel rather than a `ref` prop,
 * per PORTING.md — the Svelte source declares `ref = $bindable(null)`.
 */
export const NavbarLink = forwardRef<HTMLAnchorElement, NavbarLinkProps>(
	({ href, current = false, external = false, disabled = false, onClick, children, className }, ref) => {
		const classes = cn(
			"ft-navbar-link inline-flex shrink-0 items-center rounded-[4px] px-0.5 pb-[3px] text-[13px] whitespace-nowrap transition-colors",
			"focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none",
			current ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground",
			disabled && "pointer-events-none opacity-50",
			className
		);

		// An <a> has no native `disabled` state at all, and a synthetic click (a
		// test's `fireEvent.click`, some assistive tech) reaches this handler
		// without going through any browser gate — `aria-disabled` and the
		// stripped `href` below are the visual/semantic story, this guard is what
		// actually stops the callback.
		function handleClick(event: MouseEvent<HTMLAnchorElement>) {
			if (disabled) {
				event.preventDefault();
				return;
			}
			onClick?.(event);
		}

		return (
			<a
				ref={ref}
				href={disabled ? undefined : href}
				target={external ? "_blank" : undefined}
				rel={external ? "noopener noreferrer" : undefined}
				aria-current={current ? "page" : undefined}
				aria-disabled={disabled ? "true" : undefined}
				tabIndex={disabled ? -1 : undefined}
				className={classes}
				onClick={handleClick}
			>
				{children}
				{external ? <span className="sr-only"> (opens in a new tab)</span> : null}
			</a>
		);
	}
);

NavbarLink.displayName = "NavbarLink";
