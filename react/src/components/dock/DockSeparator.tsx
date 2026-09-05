import { cn } from "../../utils.js";
import { useDockContext } from "./types.js";

export interface DockSeparatorProps {
	/** Additional CSS classes */
	className?: string;
}

/** A rule between two groups of dock icons, laid across the dock's own axis. */
export function DockSeparator({ className = "" }: DockSeparatorProps) {
	const context = useDockContext();

	return (
		<div
			className={cn(
				"bg-secondary relative block",
				context.orientation === "vertical" ? "h-0.5 w-4/5" : "h-4/5 w-0.5",
				className
			)}
		/>
	);
}
