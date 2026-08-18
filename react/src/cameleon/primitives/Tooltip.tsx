import type { ReactNode } from "react";
import { cn } from "../../utils.js";
import { useSkin } from "../context.js";
import type { PartState } from "../types.js";

export interface TooltipProps {
	/** Text shown in the bubble on hover / keyboard focus. */
	content: string;
	/** Force a visual state (focus / error) for the /skins state matrix. */
	demoState?: PartState;
	/** Force the bubble visible (state matrix). */
	demoOpen?: boolean;
	className?: string;
	/** Trigger contents; defaults to a "?" glyph. */
	children?: ReactNode;
}

export function Tooltip({ content, demoState, demoOpen = false, className, children }: TooltipProps) {
	const ctx = useSkin();
	const parts = ctx.skin.recipes.tooltip({ state: demoState });

	return (
		<span className={cn(parts.root, className)}>
			<button type="button" className={parts.trigger} aria-label={content}>
				{children ?? "?"}
			</button>
			<span role="tooltip" className={cn(parts.bubble, demoOpen && "opacity-100")}>
				{content}
			</span>
		</span>
	);
}
