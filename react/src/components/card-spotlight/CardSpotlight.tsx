import { useRef } from "react";
import type { MouseEvent, ReactNode } from "react";

import { useIsomorphicLayoutEffect } from "../../internals/dom/ssr.js";
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
	const overlayRef = useRef<HTMLDivElement>(null);
	const restingX = -gradientSize * 10;
	const restingY = -gradientSize * 10;

	// The pointer position lives in a ref and is written straight to the overlay's
	// `background`: a mousemove patches one style property instead of re-rendering
	// the card and re-running its class merges.
	const pointerRef = useRef({ x: restingX, y: restingY });

	function paint(x: number, y: number) {
		pointerRef.current = { x, y };
		const overlay = overlayRef.current;
		if (overlay) {
			overlay.style.background = `radial-gradient(circle at ${x}px ${y}px, ${gradientColor} 0%, rgba(0, 0, 0, 0) 70%)`;
		}
	}

	function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
		const target = e.currentTarget;
		const rect = target.getBoundingClientRect();
		paint(e.clientX - rect.left, e.clientY - rect.top);
	}

	function handleMouseLeave() {
		paint(restingX, restingY);
	}

	const restingBackground = `radial-gradient(circle at ${restingX}px ${restingY}px, ${gradientColor} 0%, rgba(0, 0, 0, 0) 70%)`;

	// React rewrites `background` whenever the value in the style object below changes,
	// which would snap a live spotlight back to the resting offsets; put the current
	// pointer position back in the same commit.
	useIsomorphicLayoutEffect(() => {
		const overlay = overlayRef.current;
		if (!overlay) return;
		const { x, y } = pointerRef.current;
		overlay.style.background = `radial-gradient(circle at ${x}px ${y}px, ${gradientColor} 0%, rgba(0, 0, 0, 0) 70%)`;
	}, [restingBackground, gradientColor]);

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
				ref={overlayRef}
				className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
				style={{ background: restingBackground, opacity: gradientOpacity }}
			></div>
		</div>
	);
}
