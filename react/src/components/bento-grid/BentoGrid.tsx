import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils.js";

export interface BentoGridProps extends HTMLAttributes<HTMLDivElement> {
	className?: string;
	children?: ReactNode;
}

export function BentoGrid({ className = "", children, ...rest }: BentoGridProps) {
	return (
		<div
			className={cn(
				"mx-auto grid max-w-7xl grid-cols-1 gap-4 md:auto-rows-[18rem] md:grid-cols-3",
				className
			)}
			{...rest}
		>
			{children}
		</div>
	);
}
