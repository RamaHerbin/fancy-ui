import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils.js";
import "./bento-frame.css";

/**
 * Internal: the nested double frame both BentoGridItem and BentoGridCard are
 * drawn in. Not exported from index.ts — the two public tiles own their
 * content, this owns the chrome (outer hairline frame, inner lit panel, the
 * accent glow that rises from the bottom on hover, and the bottom-edge light
 * line).
 */
export interface BentoFrameProps extends HTMLAttributes<HTMLDivElement> {
	/** Classes for the outer frame (the grid item itself). */
	className?: string;
	/** Classes for the inner panel. */
	panelClass?: string;
	children?: ReactNode;
}

export function BentoFrame({
	className = "",
	panelClass = "",
	children,
	...rest
}: BentoFrameProps) {
	return (
		<div className={cn("bento-tile relative flex rounded-2xl p-1.5", className)} {...rest}>
			<div
				className={cn(
					"bento-panel relative isolate flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[10px]",
					panelClass
				)}
			>
				<span aria-hidden="true" className="bento-glow"></span>
				<span aria-hidden="true" className="bento-edge"></span>
				{children}
			</div>
		</div>
	);
}
