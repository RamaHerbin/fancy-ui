import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils.js";

export interface BookTitleProps extends Omit<HTMLAttributes<HTMLHeadingElement>, "className"> {
	className?: string;
	children?: ReactNode;
}

export function BookTitle({ className = "", children, ...rest }: BookTitleProps) {
	return (
		<h1 className={cn("mt-3 mb-1 font-bold text-balance select-none", className)} {...rest}>
			{children}
		</h1>
	);
}
