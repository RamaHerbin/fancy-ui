import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils.js";

export interface BookHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "className"> {
	className?: string;
	children?: ReactNode;
}

export function BookHeader({ className = "", children, ...rest }: BookHeaderProps) {
	return (
		<div className={cn("flex flex-wrap gap-2", className)} {...rest}>
			{children}
		</div>
	);
}
