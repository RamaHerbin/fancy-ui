import { forwardRef, useContext } from "react";
import type { ReactNode } from "react";

import { cn } from "../../utils.js";
import { SidebarSeparator } from "./SidebarSeparator.js";
import { SIDEBAR_KEY } from "./types.js";

export interface SidebarFooterProps {
	/** A decorative avatar, shown even when the sidebar is collapsed. */
	avatar?: ReactNode;
	/** The name / text next to the avatar. Moves to `sr-only` while collapsed — never removed. */
	children?: ReactNode;
	/** Additional CSS classes */
	className?: string;
}

export const SidebarFooter = forwardRef<HTMLDivElement, SidebarFooterProps>(function SidebarFooter(
	{ avatar, children, className },
	ref
) {
	const sidebar = useContext(SIDEBAR_KEY);
	const collapsed = sidebar?.collapsed ?? false;

	return (
		<div ref={ref} className={cn("ft-sidebar-footer mt-auto flex w-full flex-col", className)}>
			<SidebarSeparator />
			<div
				className={cn(
					"flex items-center gap-2.5 px-2 py-[7px] text-[12px]",
					"text-muted-foreground",
					collapsed && "justify-center"
				)}
			>
				{avatar ? (
					<span className="shrink-0" aria-hidden="true">
						{avatar}
					</span>
				) : null}
				<span className={cn("min-w-0 truncate", collapsed && "sr-only")}>{children}</span>
			</div>
		</div>
	);
});

SidebarFooter.displayName = "SidebarFooter";
