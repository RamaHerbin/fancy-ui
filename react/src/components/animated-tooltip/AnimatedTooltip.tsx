import { useCallback, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";

import { cn } from "../../utils.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
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

/** Where the pointer sits inside one avatar, mapped through the source's
 *  `(mouseX / 100) * 50`: the offset from the avatar's own centre, so a row of
 *  overlapping avatars poses each tooltip against the item under the pointer. */
function poseAt(event: ReactMouseEvent<HTMLElement>): TooltipPose {
	const rect = event.currentTarget.getBoundingClientRect();
	const halfWidth = rect.width / 2;
	const mouseX = event.clientX - rect.left - halfWidth;
	const value = (mouseX / 100) * 50;
	return { rotation: value, translation: value };
}

/** The inline transform one pose draws as. */
function transformFor(pose: TooltipPose): string {
	return `translateX(calc(-50% + ${pose.translation}px)) rotate(${pose.rotation}deg)`;
}

/** The id the tooltip is published under, so the wrapper can point
 *  `aria-describedby` at it while it is shown. */
function tooltipId(itemId: number | string): string {
	return `animated-tooltip-${itemId}`;
}

interface AvatarItemProps {
	item: TooltipItem;
	hovered: boolean;
	onHoverStart: (itemId: number | string) => void;
	onHoverEnd: () => void;
}

/** One avatar and its conditional tooltip. A separate component because each
 *  item owns a presence clock (the mount/unmount timing the source's
 *  transition-aware conditional block owned natively). */
function AvatarItem({ item, hovered, onHoverStart, onHoverEnd }: AvatarItemProps) {
	/**
	 * The pointer-tracked pose, and the node it is drawn on. Both refs, never
	 * state: the source reads the shared mouse position INSIDE the hovered
	 * item's conditional block, so one pointer sample rewrites one style
	 * attribute on one node. Holding the pose in React state would re-render
	 * every avatar in the row — and re-run each one's presence bookkeeping — on
	 * every mousemove, work that grows with `items.length` where the source's
	 * does not.
	 *
	 * The imperative write is also what gives the FREEZE for free. The source's
	 * block is paused the instant its item stops being the hovered one: a paused
	 * block does not update, so the leaving tooltip keeps the transform it was
	 * last drawn at while the pointer carries on moving underneath it — onto the
	 * neighbouring avatar (the `-mr-4` overlap makes that the ordinary
	 * traversal), or off the row entirely. Here a leaving item simply stops
	 * receiving writes, and the node keeps its last value. Without the freeze the
	 * exit plays from the row's CURRENT pose, and not for one frame:
	 * `tooltipScale` samples `getComputedStyle` at leg start, so the wrong pose
	 * would be baked into every keyframe of the 200ms leg.
	 */
	const pose = useRef<TooltipPose>({ rotation: 0, translation: 0 });
	const tooltip = useRef<HTMLElement | null>(null);

	/**
	 * The spec the leg currently in flight was built from, reused by any leg
	 * that reverses it. The source keeps the same options object for as long as
	 * a transition is ongoing — "so that reversible transitions reverse smoothly,
	 * rather than jumping to a new spot" — and clears it at `introend`. Rebuilt
	 * per leg instead, `tooltipScale` would capture the transform and opacity the
	 * running animation is currently PAINTING (already scaled, already faded) and
	 * compose another `scale(1 - sd·u)` on top of it, so sweeping off an avatar
	 * inside the 200ms entrance popped the tooltip to a doubly-shrunk pose.
	 */
	const spec = useRef<TransitionSpec | null>(null);

	const presence = usePresence(hovered, {
		onEnterEnd: () => {
			spec.current = null;
		},
	});

	// Block body, never a concise arrow: React 19 reads a returned value as a
	// cleanup function (convention C-3). Composed BEFORE `presence.register`'s
	// ref so the pose is on the node before anything samples its computed style.
	const attach = useCallback((node: HTMLElement | null) => {
		tooltip.current = node;
		if (node) {
			// A freshly mounted tooltip carries no transform yet, and its
			// entrance leg reads the computed style from the layout effect that
			// runs right after this ref attaches.
			node.style.transform = transformFor(pose.current);
			return;
		}
		// The node is gone; the next mount is a new element with a new capture.
		spec.current = null;
	}, []);

	const tooltipRef = useComposedRefs(
		attach,
		presence.register((node) => (spec.current ??= tooltipScale(node)))
	);

	function draw(next: TooltipPose): void {
		pose.current = next;
		if (tooltip.current) tooltip.current.style.transform = transformFor(next);
	}

	function handleMouseEnter(event: ReactMouseEvent<HTMLDivElement>): void {
		// Reset the pose first to prevent offset from previous item. A first
		// entry finds no tooltip and `attach` draws the pose on mount; a
		// re-entry during the exit finds one still mounted and redraws it here.
		draw(poseAt(event));
		onHoverStart(item.id);
	}

	function handleMouseMove(event: ReactMouseEvent<HTMLDivElement>): void {
		if (!hovered) return;
		draw(poseAt(event));
	}

	// Keyboard and touch users reach the designation too: focus opens the same
	// tooltip hover does. There is no pointer to sample, so the pose resets to
	// the centred, unrotated one the source draws at `mouseX = 0`.
	function handleFocus(): void {
		draw({ rotation: 0, translation: 0 });
		onHoverStart(item.id);
	}

	return (
		<div
			className="group relative -mr-4"
			onMouseEnter={handleMouseEnter}
			onMouseLeave={onHoverEnd}
			onMouseMove={handleMouseMove}
			onFocus={handleFocus}
			onBlur={onHoverEnd}
			tabIndex={0}
			aria-describedby={hovered ? tooltipId(item.id) : undefined}
		>
			{/* Tooltip */}
			{presence.mounted && (
				<div
					ref={tooltipRef}
					id={tooltipId(item.id)}
					role="tooltip"
					className="pointer-events-none absolute -top-16 left-1/2 z-50 flex flex-col items-center justify-center rounded-md bg-black px-4 py-2 text-xs whitespace-nowrap shadow-xl"
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

	const handleHoverStart = useCallback((itemId: number | string): void => {
		setHoveredIndex(itemId);
	}, []);

	const handleHoverEnd = useCallback((): void => {
		setHoveredIndex(null);
	}, []);

	return (
		<div className={cn("flex flex-row items-center", className)}>
			{items.map((item) => (
				<AvatarItem
					key={item.id}
					item={item}
					hovered={hoveredIndex === item.id}
					onHoverStart={handleHoverStart}
					onHoverEnd={handleHoverEnd}
				/>
			))}
		</div>
	);
}
