import type { ReactNode } from "react";

import { cn } from "../../utils.js";
import "./navigation-menu-link.css";

export interface NavigationMenuLinkProps {
	/** Destination URL. */
	href: string;
	/** Marks this as the current page: sets `aria-current="page"` and the current-row styling. */
	current?: boolean;
	/** The row's title. Ignored when `children` is given. */
	title?: string;
	/** The row's supporting description, shown under the title. Ignored when `children` is given. */
	description?: string;
	/** Marks the destination as off-site: opens in a new tab with a safe `rel`, and adds an sr-only note. */
	external?: boolean;
	/**
	 * Full override for the row's content — e.g. the mockup's feature tile,
	 * which pairs an icon with its title on one line. Takes over from
	 * `title`/`description` entirely when given.
	 */
	children?: ReactNode;
	/** Additional CSS classes. */
	className?: string;
}

/**
 * A row inside a panel. An ordinary anchor, deliberately — never
 * `role="menuitem"`.
 *
 * The source exposes no ref here, so neither does this.
 */
export function NavigationMenuLink({
	href,
	current = false,
	title,
	description,
	external = false,
	children,
	className,
}: NavigationMenuLinkProps) {
	const classes = cn(
		"ft-navigation-menu-link flex flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left no-underline transition-colors",
		"hover:bg-accent hover:text-accent-foreground focus-visible:outline-none",
		current && "bg-accent text-accent-foreground",
		className
	);

	return (
		<a
			href={href}
			className={classes}
			aria-current={current ? "page" : undefined}
			target={external ? "_blank" : undefined}
			rel={external ? "noopener noreferrer" : undefined}
		>
			{children ? (
				children
			) : (
				<>
					{title ? (
						<span className="ft-navigation-menu-link-title text-foreground block text-[12px] font-medium">
							{title}
						</span>
					) : null}
					{description ? (
						<span className="ft-navigation-menu-link-description text-muted-foreground text-[12px]">
							{description}
						</span>
					) : null}
				</>
			)}
			{external ? <span className="sr-only"> (opens in a new tab)</span> : null}
		</a>
	);
}

NavigationMenuLink.displayName = "NavigationMenuLink";
