import { cn } from "../../utils.js";
import { useDockContext } from "./types.js";

export interface DockSeparatorProps {
	/** Additional CSS classes */
	className?: string;
}

/**
 * A hairline that fades out at both ends, so it reads as a seam in the glass
 * rather than a bar laid on top of it. Laid across the dock's own axis.
 */
export function DockSeparator({ className = "" }: DockSeparatorProps) {
	const context = useDockContext();

	return (
		<div
			role="separator"
			aria-orientation={context.orientation === "vertical" ? "horizontal" : "vertical"}
			className={cn(
				"relative z-[1] block shrink-0 self-center",
				context.orientation === "vertical"
					? "h-px w-4/5 bg-gradient-to-r"
					: "h-4/5 w-px bg-gradient-to-b",
				"from-transparent via-black/15 to-transparent dark:via-white/15",
				className
			)}
		/>
	);
}
