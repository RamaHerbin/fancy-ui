import { useEffect, useRef, useState } from "react";
import { useEventCallback } from "../../internals/dom/use-event-callback.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { cn } from "../../utils.js";

/**
 * NumberTicker - Animated number counter
 *
 * Animates a number from 0 to `value` (or vice versa) with easing.
 * Triggers when the element enters the viewport via IntersectionObserver.
 * Formatted using Intl.NumberFormat.
 */
export interface NumberTickerProps {
	/** Target number to animate to */
	value?: number;
	/** Animation direction: "up" counts 0→value, "down" counts value→0 */
	direction?: "up" | "down";
	/** Animation duration in ms */
	duration?: number;
	/** Delay before animation starts (ms) */
	delay?: number;
	/** Number of decimal places to display */
	decimalPlaces?: number;
	/** Additional CSS classes */
	className?: string;
}

// Easing: easeOutCubic
function easeOutCubic(t: number): number {
	return 1 - Math.pow(1 - t, 3);
}

export function NumberTicker({
	value = 0,
	direction = "up",
	duration = 1000,
	delay = 0,
	decimalPlaces = 0,
	className,
}: NumberTickerProps) {
	const spanRef = useRef<HTMLSpanElement | null>(null);
	const [displayValue, setDisplayValue] = useState(0);
	const displayValueRef = useRef(0);
	const hasAnimatedRef = useRef(false);
	const animationFrameIdRef = useRef<number | null>(null);

	const initialValue = direction === "down" ? value : 0;

	function setDisplay(next: number) {
		displayValueRef.current = next;
		setDisplayValue(next);
	}

	// Identity-stable, so the []-deps mount effect and the re-animate effect always
	// run the latest render's closure without being rebuilt.
	const animate = useEventCallback((target: number) => {
		// One chain per instance: a target change mid-count cancels the frame still
		// in flight, so two interpolations never write `displayValue` on alternating
		// frames and the unmount cleanup always has the only live id to cancel.
		if (animationFrameIdRef.current !== null) {
			cancelAnimationFrame(animationFrameIdRef.current);
			animationFrameIdRef.current = null;
		}

		const start = displayValueRef.current;
		const startTime = performance.now() + delay;

		function tick(now: number) {
			if (now < startTime) {
				animationFrameIdRef.current = requestAnimationFrame(tick);
				return;
			}
			const elapsed = now - startTime;
			const progress = Math.min(elapsed / duration, 1);
			const easedProgress = easeOutCubic(progress);

			setDisplay(start + (target - start) * easedProgress);

			if (progress < 1) {
				animationFrameIdRef.current = requestAnimationFrame(tick);
			} else {
				animationFrameIdRef.current = null;
			}
		}

		animationFrameIdRef.current = requestAnimationFrame(tick);
	});

	// Live prop mirrors, so the observer callback reads the latest value/direction
	// exactly as the Svelte onMount closure does.
	const valueRef = useLiveRef(value);
	const directionRef = useLiveRef(direction);

	// Set initial display value
	useEffect(() => {
		if (!hasAnimatedRef.current) {
			setDisplay(initialValue);
		}
	}, [initialValue]);

	useEffect(() => {
		const node = spanRef.current;
		if (!node) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && !hasAnimatedRef.current) {
					hasAnimatedRef.current = true;
					const target = directionRef.current === "down" ? 0 : valueRef.current;
					animate(target);
					observer.disconnect();
				}
			},
			{ threshold: 0 }
		);

		observer.observe(node);

		return () => {
			observer.disconnect();
			if (animationFrameIdRef.current !== null) {
				cancelAnimationFrame(animationFrameIdRef.current);
				animationFrameIdRef.current = null;
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only observer; `animate` is identity-stable
	}, []);

	// Re-animate when value prop changes after initial animation
	const animTarget = direction === "down" ? 0 : value;
	useEffect(() => {
		if (hasAnimatedRef.current) {
			animate(animTarget);
		}
	}, [animTarget, animate]);

	const formattedValue = new Intl.NumberFormat("en-US", {
		minimumFractionDigits: decimalPlaces,
		maximumFractionDigits: decimalPlaces,
	}).format(Number(displayValue.toFixed(decimalPlaces)));

	return (
		<span
			ref={spanRef}
			className={cn(
				"number-ticker inline-block text-black tabular-nums dark:text-white",
				className
			)}
		>
			{formattedValue}
		</span>
	);
}
