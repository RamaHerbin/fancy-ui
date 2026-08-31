import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils.js";
import "./neon-border.css";

/**
 * NeonBorder - Dual-color neon glow border effect
 *
 * Two gradient layers with blur and drop-shadow create a bicolor neon effect.
 * Optional rotation animation with half or full coverage.
 */
export interface NeonBorderProps extends Omit<HTMLAttributes<HTMLDivElement>, "className" | "style"> {
	/** First neon color */
	color1?: string;
	/** Second neon color */
	color2?: string;
	/** Animation type: none (static), half (50% coverage), full (100% coverage) */
	animationType?: "none" | "half" | "full";
	/** Animation duration in seconds */
	duration?: number;
	/** Additional CSS classes */
	className?: string;
	/** Content */
	children?: ReactNode;
}

function getWidth(type: "none" | "half" | "full"): number {
	switch (type) {
		case "none":
			return 12;
		case "half":
			return 50;
		case "full":
			return 100;
	}
}

export function NeonBorder({
	color1 = "#0496ff",
	color2 = "#ff0a54",
	animationType = "half",
	duration = 6,
	className,
	children,
	...rest
}: NeonBorderProps) {
	const styleVars = {
		"--neon-duration": `${duration}s`,
		"--neon-color1": color1,
		"--neon-color2": color2,
		"--neon-width": `${getWidth(animationType)}%`,
	} as CSSProperties;
	const animated = animationType !== "none";

	return (
		<div
			className={cn(
				"neon-border-container relative z-10 inline-block h-10 w-full max-w-sm overflow-hidden rounded-lg p-px",
				className
			)}
			style={styleVars}
			{...rest}
		>
			<div className={cn("neon-layer-one rounded-lg", animated && "neon-animated")}></div>
			<div className={cn("neon-layer-two rounded-lg", animated && "neon-animated")}></div>
			{children}
		</div>
	);
}
