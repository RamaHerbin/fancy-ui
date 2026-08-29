import { cn } from "../../utils.js";

export interface DropdownMenuSeparatorProps {
	/** Additional CSS classes. */
	className?: string;
}

/** Not a menuitem, never registered with the menu-focus core: purely a visual/semantic divider. */
export function DropdownMenuSeparator({ className }: DropdownMenuSeparatorProps) {
	return (
		<div
			role="separator"
			className={cn("ft-dropdown-menu-separator bg-border my-[4px] h-px", className)}
		/>
	);
}
