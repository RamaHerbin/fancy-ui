import { useMemo, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";

import { cn } from "../../utils.js";
import { createInternalContext } from "../../internals/dom/context.js";

/** What a `<CardItem>` reads from its enclosing `<CardContainer>`. */
export interface Card3DContextValue {
	/** Whether the pointer is currently over the container. */
	isMouseEntered: boolean;
}

const Card3DContext = createInternalContext<Card3DContextValue>("Card3DContext");

/** Provider half of the container/item link. Rendered by `<CardContainer>`. */
export const Card3DProvider = Card3DContext.Provider;

/** Reads the container's hover state. Throws outside a `<CardContainer>`. */
export const useCard3D = Card3DContext.useRequired;

export interface CardContainerProps {
	/** Additional CSS classes for the tilting 3d container. */
	className?: string;
	/** Additional CSS classes for the outer perspective wrapper. */
	containerClass?: string;
	/** The card content — typically a `<CardBody>` holding `<CardItem>`s. */
	children?: ReactNode;
}

export function CardContainer({
	className = "",
	containerClass = "",
	children,
}: CardContainerProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [isMouseEntered, setIsMouseEntered] = useState(false);

	const contextValue = useMemo<Card3DContextValue>(() => ({ isMouseEntered }), [isMouseEntered]);

	function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
		const container = containerRef.current;
		if (!container) return;
		const { left, top, width, height } = container.getBoundingClientRect();
		const x = (e.clientX - left - width / 2) / 25;
		const y = (e.clientY - top - height / 2) / 25;
		container.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`;
	}

	function handleMouseEnter() {
		setIsMouseEntered(true);
	}

	function handleMouseLeave() {
		const container = containerRef.current;
		if (!container) return;
		setIsMouseEntered(false);
		container.style.transform = `rotateY(0deg) rotateX(0deg)`;
	}

	return (
		<div
			className={cn("flex items-center justify-center p-2", containerClass)}
			style={{ perspective: "1000px" }}
		>
			<div
				ref={containerRef}
				className={cn(
					"relative flex items-center justify-center transition-all duration-200 ease-linear",
					className
				)}
				style={{ transformStyle: "preserve-3d" }}
				onMouseEnter={handleMouseEnter}
				onMouseMove={handleMouseMove}
				onMouseLeave={handleMouseLeave}
			>
				<Card3DProvider value={contextValue}>{children}</Card3DProvider>
			</div>
		</div>
	);
}
