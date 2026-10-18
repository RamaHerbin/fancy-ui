import { useEffect, useRef, useState } from "react";
import type {
	CSSProperties,
	FocusEvent,
	KeyboardEvent,
	MouseEvent,
	PointerEvent,
	ReactNode,
} from "react";
import { cn } from "../../utils.js";
import { useReducedMotion } from "../../internals/motion/media-query.js";
import { useInertAttribute } from "../../internals/dom/use-inert-attribute.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import "./flip-card.css";

export type FlipCardTrigger = "hover" | "click";

export interface FlipCardProps {
	/** Axis of rotation */
	rotate?: "x" | "y";
	/**
	 * What flips the card. `hover` (default) flips on pointer hover and on
	 * keyboard focus; `click` makes the card a toggle button (click, tap,
	 * Enter or Space).
	 */
	trigger?: FlipCardTrigger;
	/**
	 * Whether the back is showing. Seeds the card on mount; changing it later
	 * turns the card the rest of the way. Pair with `onFlip` to keep it in sync
	 * (the React counterpart of the Svelte source's `bind:flipped`).
	 */
	flipped?: boolean;
	/** Called with the new state after every flip, however it happened. */
	onFlip?: (flipped: boolean) => void;
	/** Length of one flip in milliseconds */
	duration?: number;
	/** Light the faces as they turn: a sheen sweeping across and shading edge-on */
	glare?: boolean;
	/** Accessible name for the card (announced in click mode) */
	label?: string;
	/** Additional CSS classes on the card */
	className?: string;
	/** Front face content */
	children?: ReactNode;
	/** Back face content */
	back?: ReactNode;
}

/** Whether an accumulated angle (a whole number of half turns) shows the back. */
export function showsBack(angle: number): boolean {
	return Math.abs(Math.round(angle / 180)) % 2 === 1;
}

/**
 * Which way to turn, from where the pointer crosses the card's edge: the
 * card turns the way the pointer travels, so it seems pushed by it.
 * `entering` is true on enter, false on leave.
 */
export function flipDirection(
	rect: { left: number; top: number; width: number; height: number },
	point: { x: number; y: number },
	axis: "x" | "y",
	entering: boolean
): 1 | -1 {
	const along =
		axis === "y" ? point.x - rect.left - rect.width / 2 : point.y - rect.top - rect.height / 2;
	// Entering from the start side, or leaving through the end side, is
	// travelling toward the end: turn positive.
	const towardEnd = entering ? along < 0 : along >= 0;
	const sign = towardEnd ? 1 : -1;
	// rotateX turns the top away for positive angles: flip the sign so a
	// pointer moving down tips the card down.
	return (axis === "y" ? sign : -sign) as 1 | -1;
}

const INTERACTIVE =
	"a, button, input, select, textarea, label, [role='button'], [contenteditable='true']";

export function FlipCard({
	rotate = "y",
	trigger = "hover",
	flipped = false,
	onFlip,
	duration = 700,
	glare = true,
	label,
	className = "",
	children,
	back,
}: FlipCardProps) {
	const reduced = useReducedMotion();

	/** Accumulated angle: every flip adds a half turn, so it never rewinds. */
	const [angle, setAngle] = useState(() => (flipped ? 180 : 0));
	// Mirrors `angle` synchronously, so two flips inside one render cycle
	// each read the angle the previous one left.
	const angleRef = useRef(angle);
	const showingBack = showsBack(angle);

	const rootRef = useRef<HTMLDivElement | null>(null);
	const liftRef = useRef<HTMLDivElement | null>(null);
	const shadowRef = useRef<HTMLDivElement | null>(null);

	const frontInertRef = useInertAttribute<HTMLDivElement>(showingBack);
	const backInertRef = useInertAttribute<HTMLDivElement>(!showingBack);

	const live = useLiveRef({ onFlip, duration, reduced });

	function setAngleTo(next: number) {
		angleRef.current = next;
		setAngle(next);
	}

	/** The card rises through the middle of the flip and settles; its shadow spreads, then gathers. */
	function lift() {
		const { reduced, duration } = live.current;
		if (reduced) return;
		const opts = { duration, easing: "cubic-bezier(0.33, 1, 0.68, 1)" };
		liftRef.current?.animate?.(
			[
				{ transform: "translateZ(0) scale(1)" },
				{ transform: "translateZ(40px) scale(1.05)", offset: 0.45 },
				{ transform: "translateZ(0) scale(1)" },
			],
			opts
		);
		shadowRef.current?.animate?.(
			[
				{ opacity: 0.35, transform: "translateY(10px) scale(0.92)", filter: "blur(14px)" },
				{
					opacity: 0.18,
					transform: "translateY(26px) scale(0.85)",
					filter: "blur(26px)",
					offset: 0.45,
				},
				{ opacity: 0.35, transform: "translateY(10px) scale(0.92)", filter: "blur(14px)" },
			],
			opts
		);
	}

	function turn(direction: 1 | -1) {
		setAngleTo(angleRef.current + 180 * direction);
		const next = showsBack(angleRef.current);
		live.current.onFlip?.(next);
		lift();
	}

	// A `flipped` changed from outside turns the card the rest of the way.
	// Keyed on the prop alone: an internal flip never re-runs it, and a
	// consumer echoing the new state back through `onFlip` finds the card
	// already there.
	const liveLift = useLiveRef(lift);
	useEffect(() => {
		if (flipped !== showsBack(angleRef.current)) {
			setAngleTo(angleRef.current + 180);
			live.current.onFlip?.(flipped);
			liveLift.current();
		}
	}, [flipped, live, liveLift]);

	// ---- hover mode --------------------------------------------------------

	function pointerCross(event: PointerEvent<HTMLDivElement>, entering: boolean) {
		const root = rootRef.current;
		if (trigger !== "hover" || event.pointerType === "touch" || !root) return;
		const wantBack = entering;
		if (showsBack(angleRef.current) === wantBack) return;
		const dir = flipDirection(
			root.getBoundingClientRect(),
			{ x: event.clientX, y: event.clientY },
			rotate,
			entering
		);
		turn(dir);
	}

	// Keyboard users reach the back by focusing the card, in hover mode too.
	function handleFocus(event: FocusEvent<HTMLDivElement>) {
		if (trigger !== "hover" || showsBack(angleRef.current)) return;
		if (event.target === rootRef.current) turn(1);
	}
	function handleBlur(event: FocusEvent<HTMLDivElement>) {
		// React's onBlur bubbles (focusout); the Svelte source's listener does
		// not, so only the card's own blur counts here.
		if (event.target !== rootRef.current) return;
		if (trigger !== "hover" || !showsBack(angleRef.current)) return;
		const root = rootRef.current;
		if (root && event.relatedTarget instanceof Node && root.contains(event.relatedTarget)) return;
		turn(1);
	}

	// ---- click mode / touch --------------------------------------------------

	/** A click on a link or button inside a face is that control's, not the card's. */
	function isInnerControl(target: EventTarget | null): boolean {
		const root = rootRef.current;
		if (!(target instanceof Element) || !root) return false;
		const control = target.closest(INTERACTIVE);
		return control !== null && control !== root && root.contains(control);
	}

	function handleClick(event: MouseEvent<HTMLDivElement>) {
		// A tap flips a hover card too: touch has no hover to reveal the back.
		const touchOnHover =
			trigger === "hover" && (event.nativeEvent as globalThis.PointerEvent).pointerType === "touch";
		if (trigger !== "click" && !touchOnHover) return;
		if (isInnerControl(event.target)) return;
		turn(1);
	}

	function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		if (trigger !== "click" || event.target !== rootRef.current) return;
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			turn(1);
		}
	}

	const style = {
		"--fc-duration": `${duration}ms`,
		"--fc-target": `${angle}deg`,
	} as CSSProperties;

	return (
		<div
			ref={rootRef}
			className={cn("group ft-flip-card relative h-72 w-56 [perspective:1000px]", className)}
			data-axis={rotate}
			data-flipped={showingBack ? "" : undefined}
			data-trigger={trigger}
			style={style}
			role={trigger === "click" ? "button" : "group"}
			tabIndex={0}
			aria-pressed={trigger === "click" ? showingBack : undefined}
			aria-label={label}
			aria-roledescription="flip card"
			onPointerEnter={(e) => pointerCross(e, true)}
			onPointerLeave={(e) => pointerCross(e, false)}
			onFocus={handleFocus}
			onBlur={handleBlur}
			onClick={handleClick}
			onKeyDown={handleKeyDown}
		>
			<div ref={shadowRef} className="ft-flip-card__shadow" aria-hidden="true"></div>

			<div ref={liftRef} className="ft-flip-card__lift size-full [transform-style:preserve-3d]">
				<div className="ft-flip-card__inner relative size-full rounded-2xl [transform-style:preserve-3d]">
					{/* Front */}
					<div
						ref={frontInertRef}
						className="ft-flip-card__face ft-flip-card__front bg-card text-card-foreground absolute size-full overflow-hidden rounded-2xl border [backface-visibility:hidden]"
						aria-hidden={showingBack ? "true" : undefined}
					>
						{children}
						{glare ? <span className="ft-flip-card__light" aria-hidden="true"></span> : null}
					</div>

					{/* Back */}
					<div
						ref={backInertRef}
						className="ft-flip-card__face ft-flip-card__back bg-card text-card-foreground absolute size-full overflow-hidden rounded-2xl border p-4 [backface-visibility:hidden]"
						aria-hidden={showingBack ? undefined : "true"}
					>
						{back}
						{glare ? <span className="ft-flip-card__light" aria-hidden="true"></span> : null}
					</div>
				</div>
			</div>
		</div>
	);
}
