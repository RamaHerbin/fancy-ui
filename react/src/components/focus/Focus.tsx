import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { cn } from "../../utils.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { useIsomorphicLayoutEffect } from "../../internals/dom/ssr.js";
import "./focus.css";

/**
 * Focus - Sentence with a roving focus frame
 *
 * Splits a sentence into words, blurs all but the current one, and moves a
 * cornered frame over the word in focus. Cycles automatically on an interval,
 * or follows the hovered word in manual mode.
 */
export interface FocusProps {
	/** Sentence to split into words */
	sentence?: string;
	/** Follow the hovered word instead of auto-cycling */
	manualMode?: boolean;
	/** Blur applied to out-of-focus words, in px */
	blurAmount?: number;
	/** Color of the focus frame corners */
	borderColor?: string;
	/** Focus transition duration in seconds */
	animationDuration?: number;
	/** Pause between auto-cycle steps in seconds */
	pauseBetweenAnimations?: number;
	/** Additional CSS classes */
	className?: string;
}

export function Focus({
	sentence = "Fancy Focus",
	manualMode = false,
	blurAmount = 5,
	borderColor = "green",
	animationDuration = 0.5,
	pauseBetweenAnimations = 1,
	className = "",
}: FocusProps) {
	const words = sentence.split(" ");
	const containerRef = useRef<HTMLDivElement | null>(null);
	const wordElements = useRef<(HTMLSpanElement | null)[]>([]);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [focusRect, setFocusRect] = useState({ x: 0, y: 0, width: 0, height: 0 });

	// The interval callback reads the live word count, as the Svelte closure
	// does over its derived value, without restarting the interval.
	const wordCount = useLiveRef(words.length);

	function handleMouseEnter(index: number) {
		if (manualMode) {
			setCurrentIndex(index);
		}
	}

	function handleMouseLeave() {
		if (manualMode) {
			setCurrentIndex(0);
		}
	}

	// Pre-paint, the counterpart of `$effect` + `tick()`: measures the current word
	// once the DOM reflects `currentIndex`, before the browser paints. Covers mount
	// too. A passive effect would paint the zero-size frame at the container origin
	// first, then transition it into place — a visible slide-and-grow from (0,0).
	useIsomorphicLayoutEffect(() => {
		const wordEl = wordElements.current[currentIndex];
		const container = containerRef.current;
		if (!wordEl || !container) return;
		const parentRect = container.getBoundingClientRect();
		const wordRect = wordEl.getBoundingClientRect();
		setFocusRect({
			x: wordRect.left - parentRect.left,
			y: wordRect.top - parentRect.top,
			width: wordRect.width,
			height: wordRect.height,
		});
	}, [currentIndex]);

	// Mount-only, as the Svelte side starts its interval in onMount: the timing
	// props are captured once and a later change does not restart the cycle. A
	// plain ref holds them — it is never written after the first render, so the
	// mount effect reads the same values a Svelte `onMount` closure would.
	const startupRef = useRef({ manualMode, animationDuration, pauseBetweenAnimations });
	useEffect(() => {
		const { manualMode, animationDuration, pauseBetweenAnimations } = startupRef.current;
		if (manualMode) return;
		const intervalMs = animationDuration * 1000 + pauseBetweenAnimations * 1000;
		const id = setInterval(() => {
			setCurrentIndex((index) => (index + 1) % wordCount.current);
		}, intervalMs);
		return () => clearInterval(id);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<div ref={containerRef} className={cn("focus-container", className)}>
			{words.map((word, index) => (
				<span
					key={index}
					ref={(node) => {
						wordElements.current[index] = node;
					}}
					className={cn(
						"focus-word",
						manualMode && "manual",
						index === currentIndex && !manualMode && "active",
					)}
					style={
						{
							filter: index === currentIndex ? "blur(0px)" : `blur(${blurAmount}px)`,
							transition: `filter ${animationDuration}s ease`,
							"--border-color": borderColor,
						} as CSSProperties
					}
					onMouseEnter={() => handleMouseEnter(index)}
					onMouseLeave={handleMouseLeave}
				>
					{word}
				</span>
			))}

			<div
				className="focus-frame"
				style={
					{
						transform: `translate(${focusRect.x}px, ${focusRect.y}px)`,
						width: `${focusRect.width}px`,
						height: `${focusRect.height}px`,
						opacity: currentIndex >= 0 ? 1 : 0,
						transition: `all ${animationDuration}s ease`,
						"--border-color": borderColor,
					} as CSSProperties
				}
			>
				<span className="corner top-left"></span>
				<span className="corner top-right"></span>
				<span className="corner bottom-left"></span>
				<span className="corner bottom-right"></span>
			</div>
		</div>
	);
}
