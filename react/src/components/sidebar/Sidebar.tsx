import { forwardRef, useMemo } from "react";
import type { ReactNode } from "react";

import { cn } from "../../utils.js";
import { SIDEBAR_KEY, type SidebarContext } from "./types.js";
import "./sidebar.css";

export interface SidebarProps {
	/** Accessible name for the `<nav>` landmark. Defaults to `"Sidebar"`. */
	label?: string;
	/**
	 * Whether the sidebar is collapsed to an icon-only rail. A plain prop —
	 * `Sidebar` has no internal control of its own that ever changes this, so
	 * there is nothing for a controlled/uncontrolled split to round-trip. Own
	 * the state yourself and pass it down.
	 */
	collapsed?: boolean;
	/** `SidebarGroup`, `SidebarSeparator` and `SidebarFooter`. */
	children?: ReactNode;
	/** Additional CSS classes */
	className?: string;
}

export const Sidebar = forwardRef<HTMLElement, SidebarProps>(function Sidebar(
	{ label = "Sidebar", collapsed = false, children, className },
	ref
) {
	// The context VALUE is a plain object rebuilt when `collapsed` changes, and
	// that rebuild is what re-renders the nested consumers — the React shape of
	// the source's `get collapsed()` getter. Never `useMemo(..., [])` here.
	const context = useMemo<SidebarContext>(() => ({ collapsed }), [collapsed]);

	return (
		<SIDEBAR_KEY.Provider value={context}>
			<nav
				ref={ref}
				aria-label={label}
				data-collapsed={collapsed}
				className={cn(
					"ft-sidebar bg-background flex h-full flex-col gap-3 p-3",
					collapsed ? "w-[64px] items-center px-2" : "w-[240px]",
					className
				)}
			>
				{children}
			</nav>
		</SIDEBAR_KEY.Provider>
	);
});

Sidebar.displayName = "Sidebar";
