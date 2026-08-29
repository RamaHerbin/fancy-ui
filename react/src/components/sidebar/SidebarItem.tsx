import { forwardRef, useContext } from "react";
import type { MouseEvent, ReactNode, Ref } from "react";

import { cn } from "../../utils.js";
import { SIDEBAR_KEY } from "./types.js";
import "./sidebar-item.css";

export interface SidebarItemProps {
	/** Renders an `<a>` when set; a `<button type="button">` otherwise. */
	href?: string;
	/**
	 * Marks this as the current item: `aria-current="page"` plus the
	 * accent left bar — current is never conveyed by colour alone.
	 */
	current?: boolean;
	/** A count or short flag, e.g. `4` — rendered as a pill and folded into the accessible name. */
	badge?: string | number;
	/**
	 * What the badge means, read alongside its value in the accessible
	 * name (`"Inbox, 4 unread"`). Defaults to just the badge value if not given.
	 */
	badgeLabel?: string;
	/** Disables both the click and keyboard-activation paths. */
	disabled?: boolean;
	/** Click handler, for the `<button>` branch. Never called while `disabled`. */
	onClick?: (event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
	/** A decorative glyph or icon, shown even when the sidebar is collapsed. */
	icon?: ReactNode;
	/** The item's label. Moves to `sr-only` text while the sidebar is collapsed — never removed. */
	children?: ReactNode;
	/** Additional CSS classes */
	className?: string;
}

export const SidebarItem = forwardRef<HTMLAnchorElement | HTMLButtonElement, SidebarItemProps>(
	function SidebarItem(
		{ href, current = false, badge, badgeLabel, disabled = false, onClick, icon, children, className },
		ref
	) {
		const sidebar = useContext(SIDEBAR_KEY);
		const collapsed = sidebar?.collapsed ?? false;

		const hasBadge = badge !== undefined && badge !== null && badge !== "";

		const classes = cn(
			"ft-sidebar-item flex w-full items-center gap-2.5 rounded-[6px] px-2 py-[7px] text-[13px] transition-colors",
			"focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
			collapsed && "justify-center",
			current
				? "ft-sidebar-item--current bg-accent text-accent-foreground font-medium"
				: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
			disabled && "pointer-events-none opacity-50",
			className
		);

		// The native `disabled` attribute on the `<button>` branch already blocks
		// real pointer/keyboard input, and the anchor branch strips `href`
		// entirely below — but a synthetic click (a test's `fireEvent.click`,
		// some assistive tech) reaches this handler regardless of either, so the
		// guard is what actually stops the callback in both cases.
		function handleClick(event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) {
			if (disabled) {
				event.preventDefault();
				return;
			}
			onClick?.(event);
		}

		const content = (
			<>
				{icon ? (
					<span className="ft-sidebar-item-icon shrink-0" aria-hidden="true">
						{icon}
					</span>
				) : null}
				<span className={cn("min-w-0 flex-1 truncate text-left", collapsed && "sr-only")}>
					{children}
				</span>
				{hasBadge ? (
					<span className={cn("ft-sidebar-item-badge shrink-0", collapsed && "sr-only")}>
						{badge}
						{badgeLabel ? <span className="sr-only">{" "}{badgeLabel}</span> : null}
					</span>
				) : null}
			</>
		);

		return (
			<li className="ft-sidebar-item-wrapper w-full list-none">
				{href ? (
					<a
						ref={ref as Ref<HTMLAnchorElement>}
						href={disabled ? undefined : href}
						aria-current={current ? "page" : undefined}
						aria-disabled={disabled ? "true" : undefined}
						tabIndex={disabled ? -1 : undefined}
						className={classes}
						onClick={handleClick}
					>
						{content}
					</a>
				) : (
					<button
						ref={ref as Ref<HTMLButtonElement>}
						type="button"
						disabled={disabled}
						aria-current={current ? "page" : undefined}
						className={classes}
						onClick={handleClick}
					>
						{content}
					</button>
				)}
			</li>
		);
	}
);

SidebarItem.displayName = "SidebarItem";
