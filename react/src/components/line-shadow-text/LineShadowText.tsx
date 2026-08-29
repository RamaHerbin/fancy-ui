import { type ElementType } from "react";
import { cn } from "../../utils.js";
import "./line-shadow-text.css";

/**
 * LineShadowText - Text with a diagonal-hatched drop shadow duplicate
 *
 * Renders the given text once, plus a `::after` duplicate offset slightly
 * below and to the right, clipped to a diagonal line pattern and slowly
 * panned to suggest a shifting shadow.
 */
export interface LineShadowTextProps {
	/** Text to display (and to duplicate into the shadow layer) */
	text: string;
	/** Color of the shadow's diagonal lines */
	shadowColor?: string;
	/** Element type to render */
	as?: "span" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "div";
	/** Additional CSS classes */
	className?: string;
}

export function LineShadowText({
	text,
	shadowColor = "black",
	as = "span",
	className,
}: LineShadowTextProps) {
	const Element = as as ElementType;
	const style = { "--shadow-color": shadowColor } as React.CSSProperties;

	return (
		<Element
			className={cn("line-shadow-text relative z-0 inline-block", className)}
			style={style}
			data-text={text}
		>
			{text}
		</Element>
	);
}
