import { forwardRef } from "react";

import { cn } from "../../utils.js";

export interface SidebarSeparatorProps {
	/** Additional CSS classes */
	className?: string;
}

export const SidebarSeparator = forwardRef<HTMLHRElement, SidebarSeparatorProps>(
	function SidebarSeparator({ className }, ref) {
		// `<hr>` is `role="separator"` implicitly — no extra ARIA needed.
		return <hr ref={ref} className={cn("ft-sidebar-separator border-border my-2 w-full", className)} />;
	}
);

SidebarSeparator.displayName = "SidebarSeparator";
