import type { CSSProperties, ReactNode } from "react";
import { cn } from "../../utils.js";
import "./marquee.css";

export interface MarqueeProps {
	/** Additional CSS classes */
	className?: string;
	/** Reverse the scroll direction */
	reverse?: boolean;
	/** Pause the animation on hover */
	pauseOnHover?: boolean;
	/** Scroll vertically instead of horizontally */
	vertical?: boolean;
	/** Number of times to repeat the children track */
	repeat?: number;
	/** Content to repeat and scroll */
	children?: ReactNode;
}

export function Marquee({
	className,
	reverse = false,
	pauseOnHover = false,
	vertical = false,
	repeat = 4,
	children,
}: MarqueeProps) {
	return (
		<div
			className={cn(
				"fancy-marquee group flex [gap:var(--gap)] overflow-hidden p-2 [--duration:40s] [--gap:1rem]",
				vertical ? "flex-col" : "flex-row",
				className
			)}
		>
			{Array.from({ length: repeat }, (_, index) => (
				<div
					key={index}
					className={cn(
						"flex shrink-0 justify-around [gap:var(--gap)]",
						vertical ? "animate-marquee-vertical flex-col" : "animate-marquee flex-row",
						pauseOnHover ? "group-hover:[animation-play-state:paused]" : ""
					)}
					style={{ animationDirection: reverse ? "reverse" : "normal" } as CSSProperties}
				>
					{children}
				</div>
			))}
		</div>
	);
}
