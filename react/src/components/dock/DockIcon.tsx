import type { ReactNode } from "react";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useDockContext } from "./types.js";
import "./dock-icon.css";

/** Resting edge length of every icon, in pixels. */
export const DOCK_BASE_SIZE = 40;

/**
 * The magnification curve: a cosine bell rather than a straight line.
 * Full `magnification` under the pointer, easing smoothly to nothing at
 * `distance`, with a flat top and flat shoulders — so neighbours swell and
 * settle instead of forming a tent. Pure, so every framework shares the exact
 * numbers.
 */
export function dockIconSize(offset: number, magnification: number, distance: number): number {
	if (!distance || !magnification || !Number.isFinite(offset)) return DOCK_BASE_SIZE;
	const t = Math.min(Math.max(Math.abs(offset) / distance, 0), 1);
	return DOCK_BASE_SIZE + magnification * 0.5 * (1 + Math.cos(Math.PI * t));
}

export interface DockIconProps {
	/** Additional CSS classes */
	className?: string;
	/** The icon's content. */
	children?: ReactNode;
}

/**
 * One item in a `Dock`, sized from its distance to the pointer, with a floor
 * reflection and an indicator dot when it is the icon under the pointer.
 *
 * The node arrives through `useElementRef` rather than a plain `useRef`: the
 * size is computed while rendering, so the component has to re-render once the
 * element actually exists. Before it does, the offset is `Infinity` and the
 * icon renders at its resting 40px — which is also the size it has at mount,
 * with the pointer still at `Infinity`, so nothing moves on that extra render.
 */
export function DockIcon({ className = "", children }: DockIconProps) {
	const context = useDockContext();

	const [node, iconRef] = useElementRef<HTMLDivElement>();

	// Signed offset from the icon's centre to the pointer along the dock's
	// main axis, plus the icon's own half-extent on that axis. Both in viewport
	// coordinates, the same frame `Dock` records the pointer in.
	function measure(): { offset: number; half: number } {
		const vertical = context.orientation === "vertical";
		const pointer = vertical ? context.mouseY.current : context.mouseX.current;
		// Pointer outside the dock (or never tracked, as on a device that
		// cannot hover): skip the `getBoundingClientRect()` entirely.
		if (!node || !Number.isFinite(pointer)) return { offset: Infinity, half: 0 };

		const bounds = node.getBoundingClientRect();
		return vertical
			? { offset: pointer - bounds.y - bounds.height / 2, half: bounds.height / 2 }
			: { offset: pointer - bounds.x - bounds.width / 2, half: bounds.width / 2 };
	}

	const probe = measure();

	const iconSize = context.magnify
		? dockIconSize(probe.offset, context.magnification, context.distance)
		: DOCK_BASE_SIZE;

	// The icon the pointer is over (within its own half-extent) gets the
	// indicator dot. Works under reduced motion too — only the size is frozen.
	const active = Math.abs(probe.offset) <= probe.half && probe.half > 0;

	return (
		<div
			ref={iconRef}
			className={`dock-icon relative z-[1] flex aspect-square cursor-pointer items-center justify-center rounded-full ${className}`}
			style={{ width: `${iconSize}px`, height: `${iconSize}px` }}
			data-orientation={context.orientation}
			data-reflection={context.reflection || undefined}
			data-dock-active={active || undefined}
		>
			{children}
		</div>
	);
}
