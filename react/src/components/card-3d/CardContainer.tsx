import { useMemo, useRef, useState } from "react";
import type { FocusEvent, PointerEvent, ReactNode } from "react";

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
	const [pointerInside, setPointerInside] = useState(false);
	const [focusInside, setFocusInside] = useState(false);
	const isMouseEntered = pointerInside || focusInside;

	const contextValue = useMemo<Card3DContextValue>(() => ({ isMouseEntered }), [isMouseEntered]);

	// Touch and pen-less pointers never tilt: only a mouse or pen steers the card.
	const steers = (e: PointerEvent<HTMLDivElement>) => e.pointerType !== "touch";

	function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
		const container = containerRef.current;
		if (!container || !steers(e)) return;
		const { left, top, width, height } = container.getBoundingClientRect();
		const x = (e.clientX - left - width / 2) / 25;
		const y = (e.clientY - top - height / 2) / 25;
		container.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`;
	}

	function handlePointerEnter(e: PointerEvent<HTMLDivElement>) {
		if (!steers(e)) return;
		setPointerInside(true);
	}

	function handlePointerLeave(e: PointerEvent<HTMLDivElement>) {
		const container = containerRef.current;
		if (!container || !steers(e)) return;
		setPointerInside(false);
		container.style.transform = `rotateY(0deg) rotateX(0deg)`;
	}

	// Keyboard focus presents the card: its layers lift, the tilt stays neutral.
	function handleFocusIn(e: FocusEvent<HTMLDivElement>) {
		const target = e.target as Element | null;
		let visible = true;
		try {
			visible = !!target?.matches(":focus-visible");
		} catch {
			/* selector unsupported: treat as visible */
		}
		if (!visible) return;
		setFocusInside(true);
		const container = containerRef.current;
		if (container) container.style.transform = `rotateY(0deg) rotateX(0deg)`;
	}

	function handleFocusOut(e: FocusEvent<HTMLDivElement>) {
		if (containerRef.current?.contains(e.relatedTarget as Node | null)) return;
		setFocusInside(false);
	}

	return (
		<div
			className={cn("flex items-center justify-center p-2", containerClass)}
			style={{ perspective: "1000px" }}
		>
			<div
				ref={containerRef}
				className={cn(
					"relative flex items-center justify-center ease-linear motion-safe:transition-all motion-safe:duration-200",
					className
				)}
				style={{ transformStyle: "preserve-3d" }}
				onPointerEnter={handlePointerEnter}
				onPointerMove={handlePointerMove}
				onPointerLeave={handlePointerLeave}
				onFocus={handleFocusIn}
				onBlur={handleFocusOut}
			>
				<Card3DProvider value={contextValue}>{children}</Card3DProvider>
			</div>
		</div>
	);
}
