import { useState } from "react";
import type { MouseEvent, ReactNode } from "react";

import { cn } from "../../utils.js";

export interface CardSpotlightProps {
	/** Classes for the outer container. */
	className?: string;
	/** Classes for the content wrapper. */
	slotClass?: string;
	/** Radius of the spotlight gradient. */
	gradientSize?: number;
	/** Color of the spotlight. */
	gradientColor?: string;
	/** Opacity of the gradient overlay. */
	gradientOpacity?: number;
	/** The card content. */
	children?: ReactNode;
}

export function CardSpotlight({
	className = "",
	slotClass = "",
	gradientSize = 200,
	gradientColor = "#262626",
	gradientOpacity = 0.8,
	children,
}: CardSpotlightProps) {
	const [mouseX, setMouseX] = useState(() => -gradientSize * 10);
	const [mouseY, setMouseY] = useState(() => -gradientSize * 10);

	function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
		const target = e.currentTarget;
		const rect = target.getBoundingClientRect();
		setMouseX(e.clientX - rect.left);
		setMouseY(e.clientY - rect.top);
	}

	function handleMouseLeave() {
		setMouseX(-gradientSize * 10);
		setMouseY(-gradientSize * 10);
	}

	const backgroundStyle = `radial-gradient(circle at ${mouseX}px ${mouseY}px, ${gradientColor} 0%, rgba(0, 0, 0, 0) 70%)`;

	return (
		<div
			className={cn(
				"group relative flex size-full overflow-hidden rounded-xl border bg-neutral-100 text-black dark:bg-neutral-900 dark:text-white",
				className
			)}
			onMouseMove={handleMouseMove}
			onMouseLeave={handleMouseLeave}
		>
			<div className={cn("relative z-10", slotClass)}>{children}</div>
			<div
				className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
				style={{ background: backgroundStyle, opacity: gradientOpacity }}
			></div>
		</div>
	);
}
