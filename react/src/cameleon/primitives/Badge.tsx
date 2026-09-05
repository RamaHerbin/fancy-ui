import type { ReactNode } from "react";
import { cn } from "../../utils.js";
import { useSkin } from "../context.js";
import type { PartState } from "../types.js";

export interface BadgeProps {
	variant?: "default" | "solid" | "blue" | "red" | "yellow" | "green" | "purple";
	/** Force a visual state for the /skins state matrix. */
	demoState?: PartState;
	className?: string;
	children?: ReactNode;
}

export function Badge({ variant = "default", demoState, className, children }: BadgeProps) {
	const ctx = useSkin();
	const parts = ctx.skin.recipes.badge({ variant, state: demoState });

	return <span className={cn(parts.root, className)}>{children}</span>;
}
