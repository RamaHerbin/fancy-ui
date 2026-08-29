import { useInsertionEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";

import { cn } from "../../utils.js";
import { usePresence } from "../../internals/motion/presence.js";
import type { TransitionSpec } from "../../internals/motion/transitions.js";

export interface TooltipItem {
	id: number | string;
	name: string;
	designation: string;
	image: string;
}

export interface AnimatedTooltipProps {
	/** Array of items to display */
	items: TooltipItem[];
	/** Additional CSS classes for the container */
	className?: string;
}

/** The default ease-out cubic the source transition falls back to:
 *  `f = t - 1; f³ + 1`. Not in `internals/motion/easing.ts` (that module holds
 *  only the two expo curves the token table names), so it lives here. */
function cubicOut(t: number): number {
	const f = t - 1.0;
	return f * f * f + 1.0;
}

/**
 * The tooltip's scale transition, mirroring the source's stock scale
 * transition with `{ duration: 200, start: 0.6 }`: capture the element's
 * computed opacity and transform at leg start, then run
 * `scale(1 - sd·u)` / `opacity(target - od·u)` under an ease-out cubic. The
 * captured transform keeps the inline `translateX(...) rotate(...)` while the
 * scale animates on top of it, exactly as the source composes them.
 */
function tooltipScale(node: Element): TransitionSpec {
	const style = getComputedStyle(node);
	const targetOpacity = +style.opacity;
	const transform = style.transform === "none" ? "" : style.transform;
	const sd = 1 - 0.6; // 1 - start
	const od = targetOpacity; // target_opacity * (1 - opacity), opacity = 0

	return {
		delay: 0,
		duration: 200,
		easing: cubicOut,
		css: (t, u) => `
			transform: ${transform} scale(${1 - sd * u});
			opacity: ${targetOpacity - od * u}
		`,
	};
}

/** The rotate/translate pair one tooltip is drawn at. */
interface TooltipPose {
	rotation: number;
	translation: number;
}

/**
 * The pose to draw this item's tooltip at — live while the item is hovered, and
 * FROZEN at its own last hovered pose for the whole exit.
 *
 * `rotation`/`translation` are shared by the whole row, but the source reads
 * them INSIDE the item's conditional block, and that block is paused the instant
 * its item stops being the hovered one. A paused block does not update and its
 * DOM subtree is inert, so the leaving tooltip keeps the transform it was last
 * drawn at while the shared mouse position carries on moving underneath it — the
 * pointer has crossed onto the neighbouring avatar (the `-mr-4` overlap makes
 * that the ordinary traversal), or has left the row and reset the position to 0.
 *
 * Without the freeze the exit plays from the row's CURRENT pose, and not for one
 * frame: `tooltipScale` samples `getComputedStyle` at leg start, which is after
 * the wrong inline transform has been committed, so the wrong pose is baked into
 * every keyframe of the 200ms leg.
 *
 * The remembered pose is written in an insertion effect rather than during
 * render, for `useLiveRef`'s reason: a concurrent render React throws away must
 * never be able to publish a pose that was never painted.
 */
function useTooltipPose(hovered: boolean, rotation: number, translation: number): TooltipPose {
	const lastHovered = useRef<TooltipPose>({ rotation, translation });

	useInsertionEffect(() => {
		if (hovered) lastHovered.current = { rotation, translation };
	}, [hovered, rotation, translation]);

	return hovered ? { rotation, translation } : lastHovered.current;
}

interface AvatarItemProps {
	item: TooltipItem;
	hovered: boolean;
	rotation: number;
	translation: number;
	onMouseEnter: (event: ReactMouseEvent<HTMLDivElement>) => void;
	onMouseMove: (event: ReactMouseEvent<HTMLDivElement>) => void;
	onMouseLeave: () => void;
}

/** One avatar and its conditional tooltip. A separate component because each
 *  item owns a presence clock (the mount/unmount timing the source's
 *  transition-aware conditional block owned natively). */
function AvatarItem({
	item,
	hovered,
	rotation,
	translation,
	onMouseEnter,
	onMouseMove,
	onMouseLeave,
}: AvatarItemProps) {
	const presence = usePresence(hovered);
	const tooltipRef = presence.register(tooltipScale);
	const pose = useTooltipPose(hovered, rotation, translation);

	return (
		<div
			className="group relative -mr-4"
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
			onMouseMove={onMouseMove}
			role="button"
			tabIndex={0}
		>
			{/* Tooltip */}
			{presence.mounted && (
				<div
					ref={tooltipRef}
					className="pointer-events-none absolute -top-16 left-1/2 z-50 flex flex-col items-center justify-center rounded-md bg-black px-4 py-2 text-xs whitespace-nowrap shadow-xl"
					style={{
						transform: `translateX(calc(-50% + ${pose.translation}px)) rotate(${pose.rotation}deg)`,
					}}
				>
					{/* Gradient lines */}
					<div className="absolute right-1/2 -bottom-px z-30 me-1 h-px w-2/5 translate-x-1/2 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>
					<div className="absolute -bottom-px left-1/2 z-30 ms-1 h-px w-2/5 -translate-x-1/2 bg-gradient-to-r from-transparent via-sky-500 to-transparent"></div>

					{/* Content */}
					<div className="relative z-30 text-base font-bold text-white">{item.name}</div>
					<div className="text-xs text-white">{item.designation}</div>
				</div>
			)}

			{/* Avatar Image */}
			<img
				src={item.image}
				alt={item.name}
				className="relative !m-0 size-14 rounded-full border-2 border-white object-cover object-top !p-0 transition duration-500 group-hover:z-30 group-hover:scale-105"
			/>
		</div>
	);
}

export function AnimatedTooltip({ items, className }: AnimatedTooltipProps) {
	const [hoveredIndex, setHoveredIndex] = useState<number | string | null>(null);
	const [mouseX, setMouseX] = useState(0);

	// Calculate rotation and translation based on mouse position
	const rotation = (mouseX / 100) * 50;
	const translation = (mouseX / 100) * 50;

	function handleMouseEnter(event: ReactMouseEvent<HTMLDivElement>, itemId: number | string) {
		// Reset mouseX first to prevent offset from previous item
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const halfWidth = rect.width / 2;
		setMouseX(event.clientX - rect.left - halfWidth);
		setHoveredIndex(itemId);
	}

	function handleMouseMove(event: ReactMouseEvent<HTMLDivElement>) {
		if (hoveredIndex === null) return;
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const halfWidth = rect.width / 2;
		setMouseX(event.clientX - rect.left - halfWidth);
	}

	function handleMouseLeave() {
		setHoveredIndex(null);
		setMouseX(0);
	}

	return (
		<div className={cn("flex flex-row items-center", className)}>
			{items.map((item) => (
				<AvatarItem
					key={item.id}
					item={item}
					hovered={hoveredIndex === item.id}
					rotation={rotation}
					translation={translation}
					onMouseEnter={(e) => handleMouseEnter(e, item.id)}
					onMouseMove={handleMouseMove}
					onMouseLeave={handleMouseLeave}
				/>
			))}
		</div>
	);
}
