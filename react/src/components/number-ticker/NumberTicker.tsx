import { useEffect, useRef, useState } from "react";
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

	function animate(target: number) {
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
			}
		}

		animationFrameIdRef.current = requestAnimationFrame(tick);
	}

	// Keep the latest closure reachable from the []-deps mount effect, so the
	// observer callback reads live props exactly as the Svelte onMount closure does.
	const animateRef = useRef(animate);
	animateRef.current = animate;
	const latestRef = useRef({ value, direction });
	latestRef.current = { value, direction };

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
					const { value: liveValue, direction: liveDirection } = latestRef.current;
					const target = liveDirection === "down" ? 0 : liveValue;
					animateRef.current(target);
					observer.disconnect();
				}
			},
			{ threshold: 0 }
		);

		observer.observe(node);

		return () => {
			observer.disconnect();
			if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
		};
	}, []);

	// Re-animate when value prop changes after initial animation
	const animTarget = direction === "down" ? 0 : value;
	useEffect(() => {
		if (hasAnimatedRef.current) {
			animateRef.current(animTarget);
		}
	}, [animTarget]);

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
