import { useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode, TouchEvent as ReactTouchEvent } from "react";

import { cn } from "../../utils.js";
import { linear } from "../../internals/motion/easing.js";
import { usePresence } from "../../internals/motion/presence.js";
import type { TransitionSpec } from "../../internals/motion/transitions.js";

import "./direction-aware-hover.css";

type Direction = "top" | "bottom" | "left" | "right";

export interface DirectionAwareHoverProps {
	imageUrl: string;
	imageAlt?: string;
	childrenClass?: string;
	imageClass?: string;
	className?: string;
	children?: ReactNode;
}

/** The source's stock fade transition with `{ duration: 300 }`: capture the
 *  element's computed opacity at leg start, then run `opacity: t * o` under
 *  linear easing. Bidirectional — the same spec drives both legs. */
function fade300(node: Element): TransitionSpec {
	const o = +getComputedStyle(node).opacity;
	return {
		delay: 0,
		duration: 300,
		easing: linear,
		css: (t) => `opacity: ${t * o}`,
	};
}

function getDirection(
	ev: { clientX: number; clientY: number },
	obj: HTMLElement
): number {
	const { width: w, height: h, left, top } = obj.getBoundingClientRect();
	const x = ev.clientX - left - (w / 2) * (w > h ? h / w : 1);
	const y = ev.clientY - top - (h / 2) * (h > w ? w / h : 1);
	const d = Math.round(Math.atan2(y, x) / 1.57079633 + 5) % 4;
	return d;
}

function mapDirection(d: number): Direction {
	switch (d) {
		case 0:
			return "top";
		case 1:
			return "right";
		case 2:
			return "bottom";
		case 3:
			return "left";
		default:
			return "left";
	}
}

export function DirectionAwareHover({
	imageUrl,
	imageAlt = "image",
	childrenClass: childrenClassProp = "",
	imageClass: imageClassProp = "",
	className = "",
	children,
}: DirectionAwareHoverProps) {
	const divRef = useRef<HTMLDivElement>(null);
	const [direction, setDirection] = useState<Direction | null>(null);
	const [isTouched, setIsTouched] = useState(false);
	/** Read only in event handlers and written from a resize listener — no
	 *  markup depends on it, so it lives in a ref, not state. */
	const isMobileRef = useRef(false);
	const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	/** The last non-null direction. The source's transition-aware conditional
	 *  block goes inert while it outros, freezing the overlay's class at its
	 *  last hovered value for the whole fade-out; React keeps re-rendering the
	 *  exiting node, so the frozen value is reproduced explicitly. */
	const lastDirectionRef = useRef<Direction | null>(null);
	if (direction !== null) lastDirectionRef.current = direction;
	const overlayDirection = direction ?? lastDirectionRef.current;

	const overlayPresence = usePresence(direction !== null);
	const overlayRef = overlayPresence.register(fade300);
	const contentPresence = usePresence(direction !== null || isTouched);
	const contentRef = contentPresence.register(fade300);

	useEffect(() => {
		const detectMobile = () => {
			isMobileRef.current =
				window.matchMedia("(max-width: 768px)").matches || "ontouchstart" in window;
		};

		detectMobile();
		window.addEventListener("resize", detectMobile);

		return () => {
			window.removeEventListener("resize", detectMobile);
			if (touchTimerRef.current) {
				clearTimeout(touchTimerRef.current);
			}
		};
	}, []);

	function handleMouseEnter(event: ReactMouseEvent<HTMLDivElement>) {
		if (isMobileRef.current) return;
		if (!divRef.current) return;

		const fetchedDirection = getDirection(event, divRef.current);
		setDirection(mapDirection(fetchedDirection));
	}

	function handleMouseLeave() {
		if (isMobileRef.current) return;
		setDirection(null);
	}

	function handleTouchEnd() {
		if (touchTimerRef.current) {
			clearTimeout(touchTimerRef.current);
			touchTimerRef.current = null;
		}

		setTimeout(() => {
			setDirection(null);
			setIsTouched(false);
		}, 300);
	}

	function handleTouchStart(event: ReactTouchEvent<HTMLDivElement>) {
		if (!isMobileRef.current) return;

		setIsTouched(true);

		if (!divRef.current) return;
		// A touchstart always carries at least one touch; the assertion only
		// silences the indexed-access check.
		const touch = event.touches[0]!;
		const fetchedDirection = getDirection(
			{ clientX: touch.clientX, clientY: touch.clientY },
			divRef.current
		);
		setDirection(mapDirection(fetchedDirection));

		// Auto-hide after 3 seconds on mobile
		if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
		touchTimerRef.current = setTimeout(() => {
			handleTouchEnd();
		}, 3000);
	}

	const containerClass = cn(
		"group/card relative overflow-hidden rounded-lg bg-transparent transition-all duration-300",
		"h-48 w-48",
		"sm:h-64 sm:w-64",
		"md:h-80 md:w-80",
		"lg:h-96 lg:w-96",
		"xl:h-[28rem] xl:w-[28rem]",
		"touch-manipulation",
		"active:scale-[0.98]",
		"md:active:scale-100",
		className
	);

	const imageClass = cn(
		"h-full w-full object-cover transition-transform duration-300",
		"scale-125",
		"sm:scale-[1.35]",
		"md:scale-150",
		imageClassProp
	);

	const childrenClass = cn(
		"absolute z-40 text-white transition-opacity duration-300",
		"bottom-2 left-2 text-sm",
		"sm:bottom-3 sm:left-3 sm:text-base",
		"md:bottom-4 md:left-4 md:text-lg",
		childrenClassProp
	);

	const overlayClass = (() => {
		const baseClasses = "absolute inset-0 z-10 transition-all duration-300";
		const backgroundClasses = "bg-black/40 dark:bg-black/60";

		let transformClasses = "";
		switch (overlayDirection) {
			case "top":
				transformClasses = "-translate-y-full group-hover/card:translate-y-0";
				break;
			case "bottom":
				transformClasses = "translate-y-full group-hover/card:translate-y-0";
				break;
			case "left":
				transformClasses = "-translate-x-full group-hover/card:translate-x-0";
				break;
			case "right":
				transformClasses = "translate-x-full group-hover/card:translate-x-0";
				break;
			default:
				transformClasses = "";
		}

		return cn(baseClasses, backgroundClasses, transformClasses);
	})();

	const imageContainerClass = cn(
		"relative size-full bg-gray-50 transition-transform duration-300 dark:bg-black",
		{
			"translate-y-2 md:translate-y-5": direction === "top",
			"-translate-y-2 md:-translate-y-5": direction === "bottom",
			"translate-x-2 md:translate-x-5": direction === "left",
			"-translate-x-2 md:-translate-x-5": direction === "right",
		}
	);

	return (
		<div
			ref={divRef}
			className={containerClass}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			onTouchStart={handleTouchStart}
			onTouchEnd={handleTouchEnd}
			role="figure"
		>
			<div className="relative size-full overflow-hidden">
				{overlayPresence.mounted && <div ref={overlayRef} className={overlayClass}></div>}

				<div className={imageContainerClass}>
					<img src={imageUrl} alt={imageAlt} className={imageClass} width="1000" height="1000" />
				</div>

				{contentPresence.mounted && (
					<div ref={contentRef} className={childrenClass}>
						{children}
					</div>
				)}
			</div>
		</div>
	);
}
