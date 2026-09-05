import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils.js";

export interface BookDescriptionProps extends Omit<HTMLAttributes<HTMLParagraphElement>, "className"> {
	className?: string;
	children?: ReactNode;
}

export function BookDescription({ className = "", children, ...rest }: BookDescriptionProps) {
	return (
		<p className={cn("text-xs/relaxed select-none", className)} {...rest}>
			{children}
		</p>
	);
}
