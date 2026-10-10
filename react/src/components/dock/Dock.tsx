import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { cn } from "../../utils.js";
import { useMediaQuery, useReducedMotion } from "../../internals/motion/media-query.js";
import { DOCK_CONTEXT_KEY } from "./types.js";
import type { DataOrientation, Direction, DockContext } from "./types.js";
import "./dock.css";

export interface DockProps {
	/** Additional CSS classes */
	className?: string;
	/** Maximum size increase in pixels. */
	magnification?: number;
	/** Pointer distance over which the magnification falls off. */
	distance?: number;
	/** Cross-axis alignment of the icons. */
	direction?: Direction;
	/** Dock orientation. */
	orientation?: DataOrientation;
	/** A soft pool of accent light inside the shelf that follows the pointer. */
	spotlight?: boolean;
	/** A soft contact shadow / glow ellipse under each icon that grows with it. */
	reflection?: boolean;
	/** Accessible name for the toolbar. */
	ariaLabel?: string;
	/** The `DockIcon`s and `DockSeparator`s. */
	children?: ReactNode;
}

/**
 * Everything one frame writes, in one piece of state so a frame is one update
 * rather than three. The source keeps the pointer in two `{ current }` boxes
 * and the shelf-local spot in two plain runes; here the boxes are rebuilt from
 * this state on the context below.
 */
interface Tracked {
	/** Pointer, viewport coordinates; `Infinity` outside the dock. */
	x: number;
	y: number;
	/** Pointer inside the shelf, shelf-local pixels. Written to `--dock-x`/`--dock-y`. */
	spotX: number;
	spotY: number;
	hovering: boolean;
}

/**
 * An icon dock on a lit glass shelf: icons swell on a cosine curve as the
 * pointer approaches, a pool of light follows it across the shelf, and the
 * shelf edge brightens near it.
 *
 * No `ref` prop: the source exposes no bindable ref, and no rest props either —
 * it reads only these props and spreads nothing.
 */
export function Dock({
	className = "",
	magnification = 60,
	distance = 140,
	direction = "middle",
	orientation = "horizontal",
	spotlight = true,
	reflection = true,
	ariaLabel,
	children,
}: DockProps) {
	const [tracked, setTracked] = useState<Tracked>({
		x: Infinity,
		y: Infinity,
		spotX: 0,
		spotY: 0,
		hovering: false,
	});

	const shelf = useRef<HTMLDivElement>(null);

	// The magnification is a JS-written inline `width`/`height` on each icon, so
	// a CSS media query cannot stop it — the driver has to. Neither query is
	// read during render or in a lazy initializer: `useMediaQuery` answers
	// `false` for the server render and the hydration render and only then goes
	// live, which is what keeps this SSR-safe as a one-liner.
	const reduced = useReducedMotion();
	// `any-hover`, not `hover`: the unprefixed feature describes only the
	// PRIMARY pointing device, so a hybrid laptop-tablet whose primary input is
	// touch answers `(hover: none)` even with a mouse plugged in — and the dock
	// would then ignore every real mouse move. `any-hover: none` is true only
	// when NO attached device can hover, which is the actual question here.
	// Touch on such a hybrid is suppressed by `pointerType` below instead.
	const coarse = useMediaQuery("(any-hover: none)");

	// One flag, two reasons: a visitor who asked for less motion, and a device
	// where nothing can hover at all (where the icons under a finger would
	// magnify around wherever the last tap happened to land). Either way the
	// icons keep their resting 40px.
	const magnify = !reduced && !coarse;

	// Tracking is wider than magnifying: under reduced motion the pointer is
	// still followed so the indicator dot can mark the icon under it — only the
	// size change is withheld. With nothing that can hover, nothing is tracked.
	const track = !coarse;

	// One frame in flight at most: every pointer event overwrites the pending
	// coordinates and the frame applies the latest pair. A leave is just a
	// pending `Infinity`, so a move and a leave in the same frame can never
	// land in the wrong order.
	const frame = useRef(0);
	const pending = useRef({ x: Infinity, y: Infinity });

	useEffect(
		() => () => {
			if (frame.current && typeof cancelAnimationFrame === "function") {
				cancelAnimationFrame(frame.current);
			}
			frame.current = 0;
		},
		[]
	);

	function flush() {
		frame.current = 0;
		const { x, y } = pending.current;
		if (Number.isFinite(x) && Number.isFinite(y)) {
			// Measured here, in the frame, not in the state updater: an updater
			// must stay pure, and the rect is read once per frame either way.
			const rect = shelf.current?.getBoundingClientRect();
			setTracked((prev) => ({
				x,
				y,
				spotX: rect ? x - rect.left : prev.spotX,
				spotY: rect ? y - rect.top : prev.spotY,
				hovering: true,
			}));
		} else {
			setTracked((prev) => ({ ...prev, x, y, hovering: false }));
		}
	}

	function queue(x: number, y: number) {
		pending.current = { x, y };
		if (!frame.current) frame.current = requestAnimationFrame(flush);
	}

	const context = useMemo<DockContext>(
		() => ({
			mouseX: { current: tracked.x },
			mouseY: { current: tracked.y },
			magnification,
			distance,
			orientation,
			magnify,
			reflection,
		}),
		[tracked.x, tracked.y, magnification, distance, orientation, magnify, reflection]
	);

	// Pointer events, not mouse events, for one reason: `pointerType`. A tap
	// synthesises a `mousemove` indistinguishable from a real one, so on a
	// device that CAN hover but is currently being touched, the mouse-event
	// version magnified around the last tap. Non-primary pointers are dropped
	// too — a second finger has no business moving the magnifier.
	//
	// clientX/clientY, not pageX/pageY: `DockIcon` measures itself with
	// `getBoundingClientRect()`, which is relative to the VIEWPORT. Page
	// coordinates add the scroll offset, so on a scrolled page every distance
	// was off by exactly that offset and the magnifier swelled somewhere the
	// pointer was not.
	function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
		if (!track) return;
		if (e.pointerType === "touch" || !e.isPrimary) return;
		queue(e.clientX, e.clientY);
	}

	// Deliberately ungated, unlike `onPointerMove`: if the preference or the
	// pointer type flips while a pointer is already inside the dock, the last
	// tracked position would otherwise stay stuck in `mouseX`/`mouseY` forever.
	// Resetting to Infinity is what returns every icon to its resting size.
	function onPointerLeave() {
		queue(Infinity, Infinity);
	}

	const directionClass =
		direction === "top" ? "items-start" : direction === "bottom" ? "items-end" : "items-center";

	const style = {
		"--dock-x": `${tracked.spotX}px`,
		"--dock-y": `${tracked.spotY}px`,
	} as CSSProperties;

	return (
		<DOCK_CONTEXT_KEY.Provider value={context}>
			<div
				ref={shelf}
				className={cn(
					"dock-shelf relative isolate mx-auto flex h-[58px] w-max gap-3 rounded-2xl border p-2 backdrop-blur-md backdrop-saturate-150",
					"border-black/[0.08] bg-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(0,0,0,0.05),0_14px_32px_-14px_rgba(0,0,0,0.22)]",
					"dark:border-white/[0.08] dark:bg-[rgba(20,20,22,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_1px_0_rgba(0,0,0,0.5),0_18px_40px_-14px_rgba(0,0,0,0.8)]",
					orientation === "vertical" && "h-max w-[58px] flex-col",
					directionClass,
					className
				)}
				style={style}
				data-orientation={orientation}
				data-spotlight={spotlight || undefined}
				data-reflection={reflection || undefined}
				data-hover={tracked.hovering || undefined}
				onPointerMove={onPointerMove}
				onPointerLeave={onPointerLeave}
				role="toolbar"
				aria-label={ariaLabel}
				aria-orientation={orientation}
				tabIndex={0}
			>
				<span className="dock-deco" aria-hidden="true">
					{spotlight && (
						<>
							<span className="dock-spot" />
							<span className="dock-rim">
								<span className="dock-rim-light" />
							</span>
						</>
					)}
					<span className="dock-frame" />
				</span>
				{children}
			</div>
		</DOCK_CONTEXT_KEY.Provider>
	);
}
