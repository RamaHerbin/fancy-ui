import type { ReactNode } from "react";
import { cn } from "fancy-ui-react";

interface Props {
	/** CSS aspect-ratio, default "16 / 9" */
	aspect?: string;
	/** soft hover glow shadow (default true). false = border-colour hover only */
	glow?: boolean;
	className?: string;
	/** the media itself: an image, a live component, a placeholder */
	children?: ReactNode;
}

/**
 * The frame CHASSIS is tokenised (border-border / bg-surface-raised) so it
 * follows the theme. The hover glow is a fixed mid-lightness oklch on purpose:
 * one value reads as a soft shadow on a light surface and as a glow on a dark
 * one. The same literal is mirrored in Projects.tsx for the non-glow card.
 */
export function MediaFrame({ aspect = "16 / 9", glow = true, className, children }: Props) {
	return (
		<div
			className={cn(
				"border-border/60 bg-surface-raised group relative overflow-hidden rounded-[14px] border transition-[border-color,box-shadow] duration-300 hover:border-border",
				glow && "hover:shadow-[0_0_60px_oklch(0.32_0.015_80_/_0.3)]",
				className
			)}
		>
			<div className="relative" style={{ aspectRatio: aspect }}>
				{children}
			</div>
		</div>
	);
}
