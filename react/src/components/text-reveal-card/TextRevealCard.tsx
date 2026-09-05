import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { cn } from "../../utils.js";
import { TextRevealStars } from "./TextRevealStars.js";

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

	function mouseMoveHandler(event: MouseEvent) {
		event.preventDefault();
		const card = cardRef.current;
		if (card) {
			const rect = card.getBoundingClientRect();
			const relativeX = event.clientX - rect.left;
			setWidthPercentage((relativeX / rect.width) * 100);
		}
	}

	function mouseLeaveHandler() {
		isMouseOverRef.current = false;
		setIsMouseOver(false);
		setTimeout(() => {
			if (!isMouseOverRef.current) {
				setWidthPercentage(0);
			}
		}, 100);
	}

	function mouseEnterHandler() {
		isMouseOverRef.current = true;
		setIsMouseOver(true);
	}

	// touchmove is attached natively: the handler calls `preventDefault()`
	// (to stop the page scrolling while scrubbing the card, as the Svelte
	// source does), and React registers its touchmove root listener as
	// passive, where preventDefault is a no-op.
	useEffect(() => {
		const card = cardRef.current;
		if (!card) return;
		const touchMoveHandler = (event: TouchEvent) => {
			event.preventDefault();
			const rect = card.getBoundingClientRect();
			const relativeX = event.touches[0]!.clientX - rect.left;
			setWidthPercentage((relativeX / rect.width) * 100);
		};
		card.addEventListener("touchmove", touchMoveHandler, { passive: false });
		return () => card.removeEventListener("touchmove", touchMoveHandler);
	}, []);

	return (
		<div
			ref={cardRef}
			className={cn(
				"relative w-full max-w-[40rem] overflow-hidden rounded-lg border border-white/[0.08] bg-[#1d1c20] p-4 sm:p-6 md:p-8",
				className
			)}
			role="presentation"
			onMouseEnter={mouseEnterHandler}
			onMouseLeave={mouseLeaveHandler}
			onMouseMove={mouseMoveHandler}
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
						transition: isMouseOver ? "none" : "all 0.4s ease-out",
					}}
					className="absolute z-20 bg-[#1d1c20] will-change-transform"
				>
					{text}
				</div>

				{/* Reveal line */}
				<div
					style={{
						left: `${widthPercentage}%`,
						transform: `rotate(${rotateDeg}deg)`,
						opacity: widthPercentage > 0 ? 1 : 0,
						transition: isMouseOver ? "none" : "all 0.4s ease-out",
					}}
					className="absolute z-50 h-40 w-[8px] bg-gradient-to-b from-transparent via-neutral-800 to-transparent will-change-transform"
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
