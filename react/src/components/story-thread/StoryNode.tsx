import type { HTMLAttributes } from "react";
import { cn } from "../../utils.js";
import "./story-thread.css";

export interface StoryNodeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "id" | "className"> {
	/** Id the thread runs through; referenced by StoryThread's `segments`. */
	id: string;
	/** `"dot"` is a filled dot; `"ring"` a hollow ring, for a fork or a destination. */
	variant?: "dot" | "ring";
	/** Additional CSS classes. Position the node with them (or with `style`). */
	className?: string;
}

/** An anchor the thread runs through. Purely visual: hidden from assistive tech. */
export function StoryNode({ id, variant = "dot", className, ...rest }: StoryNodeProps) {
	return (
		<span
			{...rest}
			className={cn("st-node", className)}
			data-story-node={id}
			data-variant={variant}
			aria-hidden="true"
		/>
	);
}
