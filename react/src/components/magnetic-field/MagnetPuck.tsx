import { forwardRef, useContext, useEffect, useRef, useState } from "react";
import type {
	FocusEvent as ReactFocusEvent,
	HTMLAttributes,
	KeyboardEvent as ReactKeyboardEvent,
	PointerEvent as ReactPointerEvent,
	ReactNode,
} from "react";
import { cn } from "../../utils.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useFancyId } from "../../internals/use-id.js";
import type { MagneticPoint } from "./magnetic-field-core.js";
import { MAGNETIC_FIELD_KEY } from "./types.js";
import "./magnetic-field.css";

/** Read after the name, so keyboard and screen-reader users learn the keys. */
const KEY_HINT = "Space or Enter picks it up and puts it down; the arrow keys move it.";

/** Arrow-key step, px; Shift multiplies it by four. */
const KEY_STEP = 8;
const KEY_STEP_LARGE = 32;

const DEFAULT_POSITION: MagneticPoint = { x: 48, y: 48 };

export interface MagnetPuckOwnProps {
	/**
	 * The puck's centre in px, relative to its positioned parent (the field's
	 * padding box when it sits inside a `MagneticField`, where the field must
	 * be that parent: no positioned element in between). Controlled when
	 * given: dragging and the arrow keys then only report the new position
	 * through `onPositionChange`. Leave it out to let the puck keep its own,
	 * seeded from `defaultPosition`.
	 */
	position?: MagneticPoint;
	/** Initial centre when uncontrolled (no `position` prop given). */
	defaultPosition?: MagneticPoint;
	/** Called with each new position while the puck is dragged or moved with the keyboard. */
	onPositionChange?: (position: MagneticPoint) => void;
	/** Diameter in px. */
	size?: number;
	/**
	 * Whether the puck keeps attracting once released. By default it attracts
	 * only while held, and the items spring back when it is let go.
	 */
	sticky?: boolean;
	/**
	 * Accessible name. The puck is also described by a built-in hint naming
	 * its keys; pass `aria-describedby` to replace it.
	 */
	label?: string;
	/** Called when the puck is picked up (pointer down, or Space/Enter) and put down. */
	onHeldChange?: (held: boolean) => void;
	/** A custom face. Leave it out for the default black disc. */
	children?: ReactNode;
	/** Additional CSS classes. */
	className?: string;
}

/** Native `<div>` attributes are forwarded to the puck. */
export interface MagnetPuckProps
	extends MagnetPuckOwnProps, Omit<HTMLAttributes<HTMLDivElement>, keyof MagnetPuckOwnProps> {}

type Holder = "pointer" | "keyboard" | null;

export const MagnetPuck = forwardRef<HTMLDivElement, MagnetPuckProps>(function MagnetPuck(
	{
		position: positionProp,
		defaultPosition = DEFAULT_POSITION,
		onPositionChange,
		size = 40,
		sticky = false,
		label = "Magnet",
		onHeldChange,
		children,
		className,
		style,
		onPointerDown,
		onPointerMove,
		onPointerUp,
		onPointerCancel,
		onLostPointerCapture,
		onKeyDown,
		onBlur,
		...rest
	},
	forwardedRef
) {
	// Undefined outside a MagneticField: the puck is then a plain draggable,
	// and the consumer feeds `position` into a `source="manual"` field.
	const ctx = useContext(MAGNETIC_FIELD_KEY);

	const hintId = `${useFancyId()}-hint`;

	const nodeRef = useRef<HTMLDivElement | null>(null);
	const composedRef = useComposedRefs(forwardedRef, nodeRef);

	const isControlled = positionProp !== undefined;
	const [uncontrolled, setUncontrolled] = useState<MagneticPoint>(() => ({
		x: defaultPosition.x,
		y: defaultPosition.y,
	}));
	const position = isControlled ? positionProp : uncontrolled;

	/** Who holds the puck: a pointer drag, the keyboard (Space/Enter), or nobody. */
	const [holder, setHolderState] = useState<Holder>(null);
	// Mirrors `holder` synchronously, so two events dispatched in one task (a
	// pointerdown then a blur) see each other's write before React re-renders.
	const holderRef = useRef<Holder>(null);
	const held = holder !== null;

	// The position the latest handler wrote, for the same reason: a second
	// keydown in the same task must step from the first one's result.
	const positionRef = useRef<MagneticPoint>(position);
	positionRef.current = position;

	const activePointerId = useRef<number | null>(null);
	const dragStart = useRef({ x: 0, y: 0 });
	const dragOrigin = useRef<MagneticPoint>({ x: 0, y: 0 });

	function setHolder(next: Holder) {
		const was = holderRef.current !== null;
		holderRef.current = next;
		setHolderState(next);
		if (was !== (next !== null)) onHeldChange?.(next !== null);
	}

	/**
	 * Keeps the whole disc inside the positioned parent's padding box, the box
	 * `position` is measured in. An axis whose size reads 0 (not laid out yet,
	 * or jsdom) is left unclamped rather than pinned to the corner.
	 */
	function clampToParent(p: MagneticPoint): MagneticPoint {
		const el = nodeRef.current;
		const parent = (el?.offsetParent as HTMLElement | null) ?? el?.parentElement ?? null;
		if (!parent) return p;
		const half = size / 2;
		const w = parent.clientWidth;
		const h = parent.clientHeight;
		return {
			x: w > 0 ? Math.min(Math.max(p.x, half), Math.max(half, w - half)) : p.x,
			y: h > 0 ? Math.min(Math.max(p.y, half), Math.max(half, h - half)) : p.y,
		};
	}

	function moveTo(p: MagneticPoint) {
		const next = clampToParent(p);
		const current = positionRef.current;
		if (next.x === current.x && next.y === current.y) return;
		positionRef.current = next;
		if (!isControlled) setUncontrolled(next);
		onPositionChange?.(next);
	}

	function releasePointer() {
		if (activePointerId.current === null) return;
		// Cleared first: releasing capture may dispatch `lostpointercapture`
		// synchronously, and that handler must find nothing left to end.
		const id = activePointerId.current;
		activePointerId.current = null;
		nodeRef.current?.releasePointerCapture?.(id);
	}

	function release() {
		releasePointer();
		setHolder(null);
	}

	function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
		onPointerDown?.(event);
		if (event.pointerType === "mouse" && event.button !== 0) return;
		if (activePointerId.current !== null) return;
		activePointerId.current = event.pointerId;
		dragStart.current = { x: event.clientX, y: event.clientY };
		const current = positionRef.current;
		dragOrigin.current = { x: current.x, y: current.y };
		// Keeps pointermove/pointerup flowing to the puck even when a fast drag
		// outruns it. Optional call: jsdom implements neither capture method.
		nodeRef.current?.setPointerCapture?.(event.pointerId);
		setHolder("pointer");
	}

	function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
		onPointerMove?.(event);
		if (event.pointerId !== activePointerId.current) return;
		moveTo({
			x: dragOrigin.current.x + event.clientX - dragStart.current.x,
			y: dragOrigin.current.y + event.clientY - dragStart.current.y,
		});
	}

	function endPointer(event: ReactPointerEvent<HTMLDivElement>) {
		if (event.pointerId !== activePointerId.current) return;
		release();
	}

	function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
		onKeyDown?.(event);
		const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
		let dx = 0;
		let dy = 0;
		switch (event.key) {
			case "ArrowLeft":
				dx = -step;
				break;
			case "ArrowRight":
				dx = step;
				break;
			case "ArrowUp":
				dy = -step;
				break;
			case "ArrowDown":
				dy = step;
				break;
			case " ":
			case "Enter":
				event.preventDefault();
				if (event.repeat) return;
				if (holderRef.current !== null) release();
				else setHolder("keyboard");
				return;
			case "Escape":
				if (holderRef.current === null) return;
				event.preventDefault();
				release();
				return;
			default:
				return;
		}
		event.preventDefault();
		const current = positionRef.current;
		moveTo({ x: current.x + dx, y: current.y + dy });
	}

	function handleBlur(event: ReactFocusEvent<HTMLDivElement>) {
		onBlur?.(event);
		// A keyboard hold has nothing left to end it once focus moves away.
		if (holderRef.current === "keyboard") release();
	}

	// Feeds the field's "puck" channel while the puck attracts: held, or
	// released with `sticky`. A plain object is passed so the core never keeps
	// a reference to a consumer's position object. No per-run cleanup:
	// clearing between two positions of one drag would blink the channel to null.
	const x = position.x;
	const y = position.y;
	const attracting = held || sticky;
	useEffect(() => {
		if (!ctx) return;
		ctx.setSource(attracting ? { x, y } : null, "puck");
	}, [ctx, x, y, attracting]);

	// Unmounting a held or sticky puck lets the items go.
	useEffect(() => {
		return () => {
			ctx?.setSource(null, "puck");
		};
	}, [ctx]);

	// A window that loses focus mid-drag (Alt+Tab, a system dialog) may never
	// deliver the pointerup: drop the puck rather than leave it stuck in hand.
	const releaseRef = useRef(release);
	releaseRef.current = release;
	useEffect(() => {
		if (!held) return;
		const onWindowBlur = () => releaseRef.current();
		window.addEventListener("blur", onWindowBlur);
		return () => {
			window.removeEventListener("blur", onWindowBlur);
		};
	}, [held]);

	return (
		<div
			{...rest}
			ref={composedRef}
			className={cn("ft-magnet-puck", className)}
			role="button"
			tabIndex={0}
			aria-label={label}
			aria-describedby={rest["aria-describedby"] ?? hintId}
			aria-pressed={held}
			data-held={held || undefined}
			style={{
				...style,
				width: `${size}px`,
				height: `${size}px`,
				transform: `translate3d(${position.x - size / 2}px, ${position.y - size / 2}px, 0)`,
			}}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={(event) => {
				onPointerUp?.(event);
				endPointer(event);
			}}
			onPointerCancel={(event) => {
				onPointerCancel?.(event);
				endPointer(event);
			}}
			onLostPointerCapture={(event) => {
				onLostPointerCapture?.(event);
				endPointer(event);
			}}
			onKeyDown={handleKeyDown}
			onBlur={handleBlur}
		>
			{children ?? <span className="ft-magnet-puck-face" aria-hidden="true" />}
			<span id={hintId} className="ft-magnet-puck-hint">
				{KEY_HINT}
			</span>
		</div>
	);
});
