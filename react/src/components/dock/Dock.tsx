import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { cn } from "../../utils.js";
import { useMediaQuery, useReducedMotion } from "../../internals/motion/media-query.js";
import { DOCK_CONTEXT_KEY } from "./types.js";
import type { DataOrientation, Direction, DockContext } from "./types.js";

export interface DockProps {
	/** Additional CSS classes */
	className?: string;
	/** Maximum size increase in pixels. */
	magnification?: number;
	/** Pointer distance over which the magnification falls off. */
	distance?: number;
	/** Vertical alignment of the icons. */
	direction?: Direction;
	/** Dock orientation. */
	orientation?: DataOrientation;
	/**
	 * Accessible name for the toolbar. The dock spreads no rest props, so this
	 * is the only way to name one whose icons carry no label of their own.
	 */
	ariaLabel?: string;
	/** The `DockIcon`s and `DockSeparator`s. */
	children?: ReactNode;
}

/**
 * An icon dock whose items magnify smoothly as the pointer approaches.
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
	ariaLabel,
	children,
}: DockProps) {
	// One piece of state for both axes, so a single frame writes one update
	// rather than two. The source keeps two `{ current }` boxes instead only
	// because that is how its children observe a change; here the boxes are
	// rebuilt from this state on the context below.
	const [pointer, setPointer] = useState<{ x: number; y: number }>({
		x: Infinity,
		y: Infinity,
	});

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

	// Every queued frame, so none of them can land after unmount. The source has
	// no such bookkeeping because its scheduler tears the component down first;
	// React would let the callback run and warn about a write to an unmounted
	// tree. Nothing observable changes: a frame that would have been cancelled
	// had nothing left to paint into.
	const frames = useRef<Set<number>>(new Set());
	useEffect(() => {
		const pending = frames.current;
		return () => {
			for (const id of pending) cancelAnimationFrame(id);
			pending.clear();
		};
	}, []);

	const schedule = useCallback((x: number, y: number) => {
		const id = requestAnimationFrame(() => {
			frames.current.delete(id);
			setPointer({ x, y });
		});
		frames.current.add(id);
	}, []);

	const context = useMemo<DockContext>(
		() => ({
			mouseX: { current: pointer.x },
			mouseY: { current: pointer.y },
			magnification,
			distance,
			orientation,
			magnify,
		}),
		[pointer, magnification, distance, orientation, magnify]
	);

	// Pointer events, not mouse events, for one reason: `pointerType`. A tap
	// synthesises a `mousemove` indistinguishable from a real one, so on a
	// device that CAN hover but is currently being touched, the mouse-event
	// version magnified around the last tap. Non-primary pointers are dropped
	// too — a second finger has no business moving the magnifier.
	function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
		if (!magnify) return;
		if (e.pointerType === "touch" || !e.isPrimary) return;
		// Read off the synthetic event now, not inside the frame: the values are
		// what the frame needs, and the event object is not guaranteed to still
		// carry them a frame later.
		//
		// clientX/clientY, not pageX/pageY: `DockIcon` measures each icon with
		// `getBoundingClientRect()`, whose coordinates are relative to the
		// VIEWPORT. Page coordinates add the scroll offset, so on a scrolled
		// page every icon's distance to the pointer is off by exactly that
		// offset and the magnifier swells somewhere the pointer is not. The
		// Svelte source reads `pageX`/`pageY` against the same
		// `getBoundingClientRect()` and has the same bug; fixing it here is a
		// deliberate departure from PORTING.md's "port the bug" rule, recorded
		// with the port.
		const { clientX, clientY } = e;
		schedule(clientX, clientY);
	}

	// Deliberately ungated, unlike `onPointerMove`: if the preference or the
	// pointer type flips while a pointer is already inside the dock, the last
	// tracked position would otherwise stay stuck in `mouseX`/`mouseY` forever.
	// Resetting to Infinity is what returns every icon to its resting size.
	function onPointerLeave() {
		schedule(Infinity, Infinity);
	}

	const directionClass =
		direction === "top" ? "items-start" : direction === "bottom" ? "items-end" : "items-center";

	return (
		<DOCK_CONTEXT_KEY.Provider value={context}>
			<div
				className={cn(
					"mx-auto flex h-[58px] w-max gap-4 rounded-2xl border p-2 backdrop-blur-md transition-all supports-backdrop-blur:bg-white/10 supports-backdrop-blur:dark:bg-black/10",
					orientation === "vertical" && "h-max w-[58px] flex-col",
					directionClass,
					className
				)}
				onPointerMove={onPointerMove}
				onPointerLeave={onPointerLeave}
				role="toolbar"
				// `role="toolbar"` is announced as horizontal unless told
				// otherwise, so a column of icons would be described as a row.
				aria-orientation={orientation}
				aria-label={ariaLabel}
				tabIndex={0}
			>
				{children}
			</div>
		</DOCK_CONTEXT_KEY.Provider>
	);
}
