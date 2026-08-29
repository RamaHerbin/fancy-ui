import type { ReactNode } from "react";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useDockContext } from "./types.js";

export interface DockIconProps {
	/** Additional CSS classes */
	className?: string;
	/** The icon's content. */
	children?: ReactNode;
}

/**
 * One item in a `Dock`, sized from its distance to the pointer.
 *
 * The node arrives through `useElementRef` rather than a plain `useRef`: the
 * width is computed while rendering, so the component has to re-render once the
 * element actually exists. Before it does, the distance is `Infinity` and the
 * icon renders at its resting 40px — which is also the size it has at mount,
 * with the pointer still at `Infinity`, so nothing moves on that extra render.
 */
export function DockIcon({ className = "", children }: DockIconProps) {
	const context = useDockContext();

	const [node, iconRef] = useElementRef<HTMLDivElement>();

	function calculateDistance(): number {
		if (!node) return Infinity;

		const bounds = node.getBoundingClientRect();

		if (context.orientation === "vertical") {
			return context.mouseY.current - bounds.y - bounds.height / 2;
		}

		return context.mouseX.current - bounds.x - bounds.width / 2;
	}

	function computeIconWidth(): number {
		// Checked before `calculateDistance()`, not after: on a touch device or
		// under reduced motion this also skips a `getBoundingClientRect()` per
		// icon per frame, which is the whole reason the flag is read here rather
		// than only in the pointer handler.
		if (!context.magnify) return 40;

		const distanceCalc = calculateDistance();

		if (!context.distance || !context.magnification) return 40;

		if (Math.abs(distanceCalc) < context.distance) {
			return (1 - Math.abs(distanceCalc) / context.distance) * context.magnification + 40;
		}

		return 40;
	}

	const iconWidth = computeIconWidth();

	return (
		<div
			ref={iconRef}
			className={`flex aspect-square cursor-pointer items-center justify-center rounded-full transition-all duration-200 ease-out ${className}`}
			style={{ width: `${iconWidth}px`, height: `${iconWidth}px` }}
		>
			{children}
		</div>
	);
}
