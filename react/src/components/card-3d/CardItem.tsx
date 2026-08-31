import { createElement } from "react";
import type { ElementType, ReactNode } from "react";

import { cn } from "../../utils.js";
import { useCard3D } from "./CardContainer.js";

export interface CardItemProps {
	/** Element to render. */
	as?: ElementType;
	/** Additional CSS classes. */
	className?: string;
	/** X offset, in pixels, applied while the container is hovered. */
	translateX?: number | string;
	/** Y offset, in pixels, applied while the container is hovered. */
	translateY?: number | string;
	/** Z offset, in pixels, applied while the container is hovered. */
	translateZ?: number | string;
	/** X rotation, in degrees, applied while the container is hovered. */
	rotateX?: number | string;
	/** Y rotation, in degrees, applied while the container is hovered. */
	rotateY?: number | string;
	/** Z rotation, in degrees, applied while the container is hovered. */
	rotateZ?: number | string;
	/** The layer's content. */
	children?: ReactNode;
}

export function CardItem({
	as = "div",
	className = "",
	translateX = 0,
	translateY = 0,
	translateZ = 0,
	rotateX = 0,
	rotateY = 0,
	rotateZ = 0,
	children,
}: CardItemProps) {
	const { isMouseEntered } = useCard3D();

	const transform = isMouseEntered
		? `translateX(${translateX}px) translateY(${translateY}px) translateZ(${translateZ}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`
		: `translateX(0px) translateY(0px) translateZ(0px) rotateX(0deg) rotateY(0deg) rotateZ(0deg)`;

	return createElement(
		as,
		{
			className: cn("w-fit transition duration-500 ease-in-out", className),
			style: { transform },
		},
		children
	);
}
