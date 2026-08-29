import type { ReactNode } from "react";
import { cn } from "../../utils.js";

export interface FlipCardProps {
	rotate?: "x" | "y";
	className?: string;
	children?: ReactNode;
	back?: ReactNode;
}

const rotationClass = {
	x: ["group-hover:[transform:rotateX(180deg)]", "[transform:rotateX(180deg)]"],
	y: ["group-hover:[transform:rotateY(180deg)]", "[transform:rotateY(180deg)]"],
} as const;

export function FlipCard({ rotate = "y", className = "", children, back }: FlipCardProps) {
	const rotation = rotationClass[rotate];

	return (
		<div className={cn("group h-72 w-56 [perspective:1000px]", className)}>
			<div
				className={cn(
					"relative h-full rounded-2xl transition-all duration-500 [transform-style:preserve-3d]",
					rotation[0]
				)}
			>
				{/* Front */}
				<div className="absolute size-full overflow-hidden rounded-2xl border [backface-visibility:hidden]">
					{children}
				</div>

				{/* Back */}
				<div
					className={cn(
						"absolute h-full w-full overflow-hidden rounded-2xl border bg-black/80 p-4 text-slate-200 [backface-visibility:hidden]",
						rotation[1]
					)}
				>
					{back}
				</div>
			</div>
		</div>
	);
}
