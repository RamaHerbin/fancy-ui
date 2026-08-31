import { useContext } from "react";
import type { ReactNode } from "react";

import { cn } from "../../utils.js";
import { useFancyId } from "../../internals/use-id.js";
import { SIDEBAR_KEY } from "./types.js";

export interface SidebarGroupProps {
	/** The section heading, e.g. `"General"`. Required — read by `aria-labelledby`, not decorative. */
	label: string;
	/** The `SidebarItem`s in this section. */
	children?: ReactNode;
	/** Additional CSS classes */
	className?: string;
}

export function SidebarGroup({ label, children, className }: SidebarGroupProps) {
	// `undefined` outside a Sidebar: the group still renders correctly, just
	// never in the icon-only collapsed presentation.
	const sidebar = useContext(SIDEBAR_KEY);
	const collapsed = sidebar?.collapsed ?? false;

	// SSR-stable — `uid()` throws outside the browser, and this id has to
	// exist on the very first server-rendered markup for `aria-labelledby`
	// to point at something real.
	const headingId = useFancyId();

	return (
		<div className={cn("ft-sidebar-group flex w-full flex-col gap-0.5", className)}>
			<span
				id={headingId}
				className={cn(
					"text-muted-foreground/70 px-2 py-1 text-[10px] font-semibold tracking-[0.08em] uppercase",
					collapsed && "sr-only"
				)}
			>
				{label}
			</span>
			<ul className="m-0 flex list-none flex-col gap-0.5 p-0" aria-labelledby={headingId}>
				{children}
			</ul>
		</div>
	);
}
