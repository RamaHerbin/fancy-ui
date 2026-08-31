import type { ReactNode } from "react";

import { cn } from "../../utils.js";

export interface CardBodyProps {
	/** Additional CSS classes. */
	className?: string;
	/** The card's layers — typically `<CardItem>`s. */
	children?: ReactNode;
}

export function CardBody({ className = "", children }: CardBodyProps) {
	return (
		<div className={cn("h-96 w-96", className)} style={{ transformStyle: "preserve-3d" }}>
			{children}
		</div>
	);
}
