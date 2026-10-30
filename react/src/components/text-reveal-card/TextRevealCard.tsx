import {
	useEffect,
	useRef,
	useState,
	type FocusEvent,
	type KeyboardEvent,
	type PointerEvent,
	type ReactNode,
} from "react";
import { cn } from "../../utils.js";
import { TextRevealStars } from "./TextRevealStars.js";
import "./text-reveal-card.css";

/**
 * TextRevealCard - A card whose hidden text is wiped into view by the
 * pointer. A clipped reveal layer and a tilted reveal line follow the
 * pointer's horizontal position; leaving the card eases everything back.
 */
export interface TextRevealCardProps {
	className?: string;
	/** Number of stars rendered behind the hidden text */
	starsCount?: number;
	/** Additional CSS classes applied to each star */
	starsClass?: string;
	/** Seed forwarded to the star field (see TextRevealStars) */
	starsSeed?: number;
	children?: ReactNode;
	/** Content of the reveal layer (shown where the pointer has wiped) */
	text?: ReactNode;
	/** Content of the background layer (visible before the wipe) */
	revealText?: ReactNode;
}

export function TextRevealCard({
	className = "",
	starsCount = 130,
	starsClass = "",
	starsSeed,
	children,
	text,
	revealText,
}: TextRevealCardProps) {
	const cardRef = useRef<HTMLDivElement | null>(null);
	const [widthPercentage, setWidthPercentage] = useState(0);
	const [isMouseOver, setIsMouseOver] = useState(false);
	// Mirror for the leave-handler's timeout: its closure must read the
	// CURRENT hover state 100ms later, not the render it was created in.
	const isMouseOverRef = useRef(false);

	const rotateDeg = (widthPercentage - 50) * 0.1;

	// Hover scrub is for a mouse or pen: a touch pointer is the touch handlers' job.
	function pointerMoveHandler(event: PointerEvent) {
		if (event.pointerType === "touch") return;
		event.preventDefault();
		const card = cardRef.current;
		if (card) {
			const rect = card.getBoundingClientRect();
			const relativeX = event.clientX - rect.left;
			setWidthPercentage((relativeX / rect.width) * 100);
		}
	}

	// Keyboard path: focus shows the fully revealed text (no partial scrub);
	// Escape or blur returns to rest. Nothing extra is announced: the text is in the DOM.
	const focusRevealedRef = useRef(false);

	function focusInHandler() {
		// A click or tap focuses the card too, while the pointer or finger drives the scrub:
		// only keyboard-style focus reveals, even under a resting pointer.
		let visible: boolean;
		try {
			visible = cardRef.current?.matches(":focus-visible") ?? false;
		} catch {
			// `:focus-visible` unsupported: focus with no pointer over the card is keyboard focus
			visible = !isMouseOverRef.current;
		}
		if (!visible) return;
		focusRevealedRef.current = true;
		setWidthPercentage(100);
	}

	function focusOutHandler(event: FocusEvent<HTMLDivElement>) {
		if (event.relatedTarget instanceof Node && cardRef.current?.contains(event.relatedTarget))
			return;
		if (!focusRevealedRef.current) return;
		focusRevealedRef.current = false;
		setWidthPercentage(0);
	}

	function keyDownHandler(event: KeyboardEvent<HTMLDivElement>) {
		if (event.key !== "Escape" || !focusRevealedRef.current) return;
		focusRevealedRef.current = false;
		setWidthPercentage(0);
	}

	function mouseLeaveHandler() {
		isMouseOverRef.current = false;
		setIsMouseOver(false);
		setTimeout(() => {
			if (!isMouseOverRef.current) {
				setWidthPercentage(focusRevealedRef.current ? 100 : 0);
			}
		}, 100);
	}

	function mouseEnterHandler() {
		isMouseOverRef.current = true;
		setIsMouseOver(true);
	}

	function pointerEnterHandler(event: PointerEvent) {
		if (event.pointerType === "touch") return;
		mouseEnterHandler();
	}

	function pointerLeaveHandler(event: PointerEvent) {
		if (event.pointerType === "touch") return;
		mouseLeaveHandler();
	}

	// touchmove is attached natively and passive: the card only tracks the
	// finger, it never cancels the gesture, so the page keeps scrolling
	// vertically (`touch-pan-y`).
	useEffect(() => {
		const card = cardRef.current;
		if (!card) return;
		const touchMoveHandler = (event: TouchEvent) => {
			const rect = card.getBoundingClientRect();
			const relativeX = event.touches[0]!.clientX - rect.left;
			setWidthPercentage((relativeX / rect.width) * 100);
		};
		card.addEventListener("touchmove", touchMoveHandler, { passive: true });
		return () => card.removeEventListener("touchmove", touchMoveHandler);
	}, []);

	return (
		<div
			ref={cardRef}
			className={cn(
				"relative w-full max-w-[40rem] touch-pan-y touch-pinch-zoom overflow-hidden rounded-lg border border-white/[0.08] bg-[#1d1c20] p-4 sm:p-6 md:p-8",
				className
			)}
			role="group"
			tabIndex={0}
			onFocus={focusInHandler}
			onBlur={focusOutHandler}
			onKeyDown={keyDownHandler}
			onPointerEnter={pointerEnterHandler}
			onPointerLeave={pointerLeaveHandler}
			onPointerMove={pointerMoveHandler}
			onTouchStart={mouseEnterHandler}
			onTouchEnd={mouseLeaveHandler}
		>
			{children}

			<div className="relative flex h-40 items-center overflow-hidden">
				{/* Reveal layer */}
				<div
					style={{
						width: "100%",
						opacity: widthPercentage > 0 ? 1 : 0,
						clipPath: `inset(0 ${100 - widthPercentage}% 0 0)`,
					}}
					className={
						isMouseOver
							? "absolute z-20 bg-[#1d1c20] will-change-transform"
							: "text-reveal-settle absolute z-20 bg-[#1d1c20] will-change-transform"
					}
				>
					{text}
				</div>

				{/* Reveal line */}
				<div
					style={{
						left: `${widthPercentage}%`,
						transform: `rotate(${rotateDeg}deg)`,
						opacity: widthPercentage > 0 ? 1 : 0,
					}}
					className={
						isMouseOver
							? "absolute z-50 h-40 w-[8px] bg-gradient-to-b from-transparent via-neutral-800 to-transparent will-change-transform"
							: "text-reveal-settle absolute z-50 h-40 w-[8px] bg-gradient-to-b from-transparent via-neutral-800 to-transparent will-change-transform"
					}
				></div>

				{/* Background text + stars */}
				<div className="overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,white,transparent)]">
					{revealText}
					<TextRevealStars starsCount={starsCount} className={starsClass} seed={starsSeed} />
				</div>
			</div>
		</div>
	);
}
