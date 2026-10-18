import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";

import { cn } from "../../utils.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { linear } from "../../internals/motion/easing.js";
import { useReducedMotion } from "../../internals/motion/media-query.js";
import { usePresence } from "../../internals/motion/presence.js";
import type { TransitionSpec } from "../../internals/motion/transitions.js";

import "./animated-tooltip.css";

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
	/**
	 * Tint of the presence ring and the light sweep under the name. Any CSS
	 * colour (`"#f5a97f"`, `"oklch(0.7 0.14 160)"`, `"var(--primary)"`).
	 * Leave unset for the default soft iridescent pair, which adapts to the
	 * light and dark themes.
	 */
	accent?: string;
	/** Avatar diameter in pixels. */
	size?: number;
}

type ItemId = number | string;

/** The id the tooltip is published under, so the wrapper can point
 *  `aria-describedby` at it while it is shown. */
function tooltipId(itemId: ItemId): string {
	return `animated-tooltip-${itemId}`;
}

/**
 * The inline transform the tooltip positioner is drawn at. `mouseX` is the
 * pointer's offset from the hovered avatar's centre, normalised by half the
 * avatar size to [-1, 1]: the card leans up to 7deg and slides up to 14px
 * toward the pointer; reduced motion keeps it upright.
 */
function transformFor(mouseX: number, size: number, reduced: boolean): string {
	const lean = reduced ? 0 : Math.max(-1, Math.min(1, mouseX / (size / 2)));
	const rotation = lean * 7;
	const translation = lean * 14;
	return `translateX(calc(-50% + ${translation}px)) rotate(${rotation}deg)`;
}

/** How far item `i` steps aside to make room for the active one. */
function partOffset(i: number, activeIndex: number, reduced: boolean): number {
	if (activeIndex < 0 || reduced) return 0;
	const d = i - activeIndex;
	const distance = Math.abs(d);
	if (distance === 1) return Math.sign(d) * 6;
	if (distance === 2) return Math.sign(d) * 2;
	return 0;
}

interface SinkParams {
	entering: boolean;
	still: boolean;
}

/**
 * Exit: a short settle downward (opacity only under reduced motion). The
 * source carries this as an exit-only transition, so the ENTER leg runs at
 * duration 0 — the card appears at rest and its entrance is the CSS
 * `at-rise` / `at-fade` keyframe, exactly as in the source. A reversal
 * mid-exit therefore snaps back to rest rather than replaying anything, which
 * is what an exit-only transition does when its block resumes.
 */
function sink(_node: Element, params?: SinkParams): TransitionSpec {
	if (!params || params.entering) {
		return { delay: 0, duration: 0, easing: linear, css: () => "" };
	}
	const still = params.still;
	return {
		delay: 0,
		duration: still ? 120 : 160,
		easing: (t: number) => t * t,
		css: (t: number) =>
			still
				? `opacity: ${t};`
				: `opacity: ${t}; transform: translateY(${(1 - t) * 4}px) scale(${0.97 + 0.03 * t});`,
	};
}

interface AvatarItemProps {
	item: TooltipItem;
	active: boolean;
	shift: number;
	reduced: boolean;
	onEnter: (itemId: ItemId, event: ReactMouseEvent<HTMLDivElement>) => void;
	onMove: (event: ReactMouseEvent<HTMLDivElement>) => void;
	onLeave: () => void;
	onFocusIn: (itemId: ItemId) => void;
	onTip: (itemId: ItemId, node: HTMLElement | null, previous: HTMLElement | null) => void;
}

/** One avatar and its conditional tooltip. A separate component because each
 *  item owns a presence clock (the mount/unmount timing the source's
 *  transition-aware conditional block owned natively). */
function AvatarItem({
	item,
	active,
	shift,
	reduced,
	onEnter,
	onMove,
	onLeave,
	onFocusIn,
	onTip,
}: AvatarItemProps) {
	const presence = usePresence(active);
	// Rewritten every render, read at the instant a leg starts: the source's
	// exit reads the reduced-motion flag when the outro begins.
	const cardRef = presence.register(sink, (entering) => ({ entering, still: reduced }));

	// The positioner is handed to the row, which alone writes its transform.
	// Block body, never a concise arrow: React 19 reads a returned value as a
	// cleanup function.
	const tipNode = useRef<HTMLElement | null>(null);
	const itemId = item.id;
	const attachTip = useCallback(
		(node: HTMLElement | null) => {
			if (node) {
				tipNode.current = node;
				onTip(itemId, node, null);
				return;
			}
			onTip(itemId, null, tipNode.current);
			tipNode.current = null;
		},
		[itemId, onTip]
	);

	return (
		<div
			className={cn("at-item group relative", active && "at-active", shift !== 0 && "at-parted")}
			style={{ "--_at-shift": `${shift}px` } as CSSProperties}
			data-active={active ? "" : undefined}
			data-part={shift < 0 ? "before" : shift > 0 ? "after" : undefined}
			onMouseEnter={(event) => onEnter(item.id, event)}
			onMouseLeave={onLeave}
			onMouseMove={onMove}
			onFocus={() => onFocusIn(item.id)}
			onBlur={onLeave}
			tabIndex={0}
			aria-describedby={active ? tooltipId(item.id) : undefined}
		>
			{/* Tooltip */}
			{presence.mounted && (
				<div
					ref={attachTip}
					id={tooltipId(item.id)}
					role="tooltip"
					className="at-tip pointer-events-none absolute left-1/2 z-50"
				>
					<div ref={cardRef} className="at-card">
						<span className="at-pointer" aria-hidden="true"></span>
						<div className="at-name">{item.name}</div>
						<span className="at-rule" aria-hidden="true">
							<span className="at-glint"></span>
						</span>
						<div className="at-role">{item.designation}</div>
					</div>
				</div>
			)}

			{/* Avatar: presence ring + photo */}
			<div className={cn("at-avatar", active && !reduced && "at-lifted")}>
				<span className="at-glow" aria-hidden="true"></span>
				<span className="at-disc" aria-hidden="true"></span>
				<span className="at-ring" aria-hidden="true"></span>
				<img
					src={item.image}
					alt={item.name}
					className="at-img relative !m-0 rounded-full object-cover object-top !p-0"
				/>
			</div>
		</div>
	);
}

export function AnimatedTooltip({ items, className, accent, size = 56 }: AnimatedTooltipProps) {
	const reduced = useReducedMotion();

	const [hoveredId, setHoveredId] = useState<ItemId | null>(null);

	/**
	 * The pointer offset, the hovered id as the handlers see it, and every
	 * mounted tooltip positioner. Refs, never state: the source reads the
	 * shared `mouseX` only INSIDE the active item's conditional block, so one
	 * pointer sample rewrites one style attribute on one node. Holding it in
	 * React state would re-render every avatar in the row on every mousemove.
	 *
	 * Writing only to the ACTIVE item's positioner is also what reproduces the
	 * source's freeze: a leaving block is paused, so its tooltip keeps the
	 * transform it was last drawn at while the pointer moves on — onto the
	 * overlapping neighbour or off the row, where `mouseX` resets to 0.
	 */
	const mouseX = useRef(0);
	const hovered = useRef<ItemId | null>(null);
	const tips = useRef(new Map<ItemId, HTMLElement>());
	const reducedRef = useLiveRef(reduced);
	const sizeRef = useLiveRef(size);

	const draw = useCallback(
		(itemId: ItemId): void => {
			const node = tips.current.get(itemId);
			if (node)
				node.style.transform = transformFor(mouseX.current, sizeRef.current, reducedRef.current);
		},
		[reducedRef, sizeRef]
	);

	const onTip = useCallback(
		(itemId: ItemId, node: HTMLElement | null, previous: HTMLElement | null): void => {
			if (node) {
				tips.current.set(itemId, node);
				// A freshly mounted positioner carries no transform yet.
				draw(itemId);
				return;
			}
			if (tips.current.get(itemId) === previous) tips.current.delete(itemId);
		},
		[draw]
	);

	const activate = useCallback(
		(itemId: ItemId): void => {
			hovered.current = itemId;
			setHoveredId(itemId);
			// A re-entry during the exit finds the positioner still mounted and
			// redraws it; a first entry finds none and `onTip` draws on mount.
			draw(itemId);
		},
		[draw]
	);

	const handleMouseEnter = useCallback(
		(itemId: ItemId, event: ReactMouseEvent<HTMLDivElement>): void => {
			// Reset mouseX first to prevent offset from previous item
			const rect = event.currentTarget.getBoundingClientRect();
			mouseX.current = event.clientX - rect.left - rect.width / 2;
			activate(itemId);
		},
		[activate]
	);

	const handleMouseMove = useCallback(
		(event: ReactMouseEvent<HTMLDivElement>): void => {
			if (hovered.current === null) return;
			const rect = event.currentTarget.getBoundingClientRect();
			mouseX.current = event.clientX - rect.left - rect.width / 2;
			draw(hovered.current);
		},
		[draw]
	);

	const handleLeave = useCallback((): void => {
		hovered.current = null;
		mouseX.current = 0;
		setHoveredId(null);
	}, []);

	const handleFocusIn = useCallback(
		(itemId: ItemId): void => {
			mouseX.current = 0;
			activate(itemId);
		},
		[activate]
	);

	// The source derives the lean from `size` and the reduced-motion flag, so
	// either changing redraws the active card.
	useEffect(() => {
		if (hovered.current !== null) draw(hovered.current);
	}, [draw, reduced, size]);

	/** Index of the active item, or -1 when nothing is hovered/focused. */
	const activeIndex = hoveredId === null ? -1 : items.findIndex((item) => item.id === hoveredId);

	const rootStyle = {
		"--_at-size": `${size}px`,
		...(accent
			? {
					"--at-accent": accent,
					"--at-accent-2": `color-mix(in oklab, ${accent} 62%, white)`,
				}
			: {}),
	} as CSSProperties;

	return (
		<div className={cn("at-root flex flex-row items-center", className)} style={rootStyle}>
			{items.map((item, i) => (
				<AvatarItem
					key={item.id}
					item={item}
					active={hoveredId === item.id}
					shift={partOffset(i, activeIndex, reduced)}
					reduced={reduced}
					onEnter={handleMouseEnter}
					onMove={handleMouseMove}
					onLeave={handleLeave}
					onFocusIn={handleFocusIn}
					onTip={onTip}
				/>
			))}
		</div>
	);
}
