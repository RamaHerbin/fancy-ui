import { useMemo, useState } from "react";
import { cn } from "../../utils.js";
import { useFancyId } from "../../internals/use-id.js";
import { useIsomorphicLayoutEffect } from "../../internals/dom/ssr.js";
import { useEventCallback } from "../../internals/dom/use-event-callback.js";

/**
 * A target element for the beam. The Svelte side receives the live elements
 * (`bind:this` values); in React the same prop also accepts a ref object,
 * since `ref.current` is how a React consumer holds an element.
 */
export type AnimatedBeamTarget = HTMLElement | { readonly current: HTMLElement | null };

export interface AnimatedBeamProps {
	className?: string;
	containerRef: AnimatedBeamTarget | null;
	fromRef: AnimatedBeamTarget | null;
	toRef: AnimatedBeamTarget | null;
	curvature?: number;
	reverse?: boolean;
	pathColor?: string;
	pathWidth?: number;
	pathOpacity?: number;
	gradientStartColor?: string;
	gradientStopColor?: string;
	/** Seconds the beam waits before its first travel. Feeds the gradient
	 * animations' `begin`, so a group of beams can be staggered. */
	delay?: number;
	duration?: number;
	startXOffset?: number;
	startYOffset?: number;
	endXOffset?: number;
	endYOffset?: number;
	/**
	 * Seed for the default animation duration. The Svelte side randomises the
	 * default (`Math.random() * 3 + 4`); a render-path `Math.random()` would
	 * make the server render and its hydration disagree, so the default is
	 * derived deterministically from this seed instead. Two beams with no
	 * `seed` and no `duration` share the same pace — vary the seed (or pass
	 * `duration`) to desynchronise them.
	 */
	seed?: number;
}

/** mulberry32 — a tiny deterministic PRNG standing in for `Math.random()`. */
function mulberry32(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function resolveTarget(target: AnimatedBeamTarget | null | undefined): HTMLElement | null {
	if (!target) return null;
	return target instanceof HTMLElement ? target : target.current;
}

export function AnimatedBeam({
	className = "",
	containerRef,
	fromRef,
	toRef,
	curvature = 0,
	reverse = false,
	pathColor = "gray",
	pathWidth = 2,
	pathOpacity = 0.2,
	gradientStartColor = "#FFAA40",
	gradientStopColor = "#9C40FF",
	delay = 0,
	duration,
	startXOffset = 0,
	startYOffset = 0,
	endXOffset = 0,
	endYOffset = 0,
	seed = 1,
}: AnimatedBeamProps) {
	// Unique id for the gradient (the Svelte side mints one with
	// `Math.random()`; `useFancyId` is the SSR-stable equivalent).
	const id = useFancyId("beam");

	// Default duration — the Svelte side's `Math.random() * 3 + 4`, seeded.
	const defaultDuration = useMemo(() => mulberry32(seed)() * 3 + 4, [seed]);
	const resolvedDuration = duration ?? defaultDuration;

	const [isVertical, setIsVertical] = useState(false);
	const [isRightToLeft, setIsRightToLeft] = useState(false);
	const [isBottomToTop, setIsBottomToTop] = useState(false);
	const [pathD, setPathD] = useState("");
	const [svgDimensions, setSvgDimensions] = useState<{ width: number; height: number }>({
		width: 0,
		height: 0,
	});

	// Derived values for animation
	const x1 = (reverse ? !isRightToLeft : isRightToLeft) ? "90%; -10%;" : "10%; 110%;";
	const x2 = (reverse ? !isRightToLeft : isRightToLeft) ? "100%; 0%;" : "0%; 100%;";
	const y1 = (reverse ? !isBottomToTop : isBottomToTop) ? "90%; -10%;" : "10%; 110%;";
	const y2 = (reverse ? !isBottomToTop : isBottomToTop) ? "100%; 0%;" : "0%; 100%;";

	// The path calculation reads the current render's props, exactly like the
	// Svelte closure. `useEventCallback` keeps the identity stable for the life
	// of the component while publishing the closure from an insertion effect, so
	// the long-lived ResizeObserver callback never goes stale and a render React
	// throws away never installs itself.
	const updatePath = useEventCallback(() => {
		const container = resolveTarget(containerRef);
		const from = resolveTarget(fromRef);
		const to = resolveTarget(toRef);
		if (container && from && to) {
			const containerRect = container.getBoundingClientRect();
			const rectA = from.getBoundingClientRect();
			const rectB = to.getBoundingClientRect();

			const svgWidth = containerRect.width;
			const svgHeight = containerRect.height;
			setSvgDimensions({ width: svgWidth, height: svgHeight });

			const startX = rectA.left - containerRect.left + rectA.width / 2 + startXOffset;
			const startY = rectA.top - containerRect.top + rectA.height / 2 + startYOffset;
			const endX = rectB.left - containerRect.left + rectB.width / 2 + endXOffset;
			const endY = rectB.top - containerRect.top + rectB.height / 2 + endYOffset;

			// Check if the light beam is in a vertical direction
			setIsVertical(Math.abs(endY - startY) > Math.abs(endX - startX));

			// Determine the animation direction
			setIsRightToLeft(endX < startX);
			setIsBottomToTop(endY < startY);

			const controlY = startY - curvature;
			const d = `M ${startX},${startY} Q ${(startX + endX) / 2},${controlY} ${endX},${endY}`;
			setPathD(d);
		}
	});

	// Setup ResizeObserver — the counterpart of the Svelte onMount, re-run
	// only when the container target itself changes. Layout phase, not passive:
	// until the measurement lands the svg is 0x0 with an empty `d`, so a
	// post-paint first measure shows one frame with no beam. `updatePath` is
	// identity-stable, so it never re-runs this on its own.
	useIsomorphicLayoutEffect(() => {
		const container = resolveTarget(containerRef);
		if (!container) return;

		const resizeObserver = new ResizeObserver(() => {
			updatePath();
		});
		resizeObserver.observe(container);

		// Initial path calculation
		updatePath();

		return () => {
			resizeObserver.disconnect();
		};
	}, [containerRef, updatePath]);

	return (
		<svg
			fill="none"
			width={svgDimensions.width}
			height={svgDimensions.height}
			xmlns="http://www.w3.org/2000/svg"
			className={cn(
				"pointer-events-none absolute top-0 left-0 transform-gpu stroke-2",
				className
			)}
			viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
		>
			<path
				d={pathD}
				stroke={pathColor}
				strokeWidth={pathWidth}
				strokeOpacity={pathOpacity}
				strokeLinecap="round"
			/>
			<path
				d={pathD}
				strokeWidth={pathWidth}
				stroke={`url(#${id})`}
				strokeOpacity="1"
				strokeLinecap="round"
			/>
			<defs>
				<linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0%" x2="0%" y1="0%" y2="0%">
					<stop stopColor={gradientStartColor} stopOpacity="0" />
					<stop stopColor={gradientStartColor} />
					<stop offset="32.5%" stopColor={gradientStopColor} />
					<stop offset="100%" stopColor={gradientStopColor} stopOpacity="0" />
					{!isVertical ? (
						<>
							<animate
								attributeName="x1"
								values={x1}
								dur={`${resolvedDuration}s`}
								begin={`${delay}s`}
								keyTimes="0; 1"
								keySplines="0.16 1 0.3 1"
								calcMode="spline"
								repeatCount="indefinite"
							/>
							<animate
								attributeName="x2"
								values={x2}
								dur={`${resolvedDuration}s`}
								begin={`${delay}s`}
								keyTimes="0; 1"
								keySplines="0.16 1 0.3 1"
								calcMode="spline"
								repeatCount="indefinite"
							/>
						</>
					) : (
						<>
							<animate
								attributeName="y1"
								values={y1}
								dur={`${resolvedDuration}s`}
								begin={`${delay}s`}
								keyTimes="0; 1"
								keySplines="0.16 1 0.3 1"
								calcMode="spline"
								repeatCount="indefinite"
							/>
							<animate
								attributeName="y2"
								values={y2}
								dur={`${resolvedDuration}s`}
								begin={`${delay}s`}
								keyTimes="0; 1"
								keySplines="0.16 1 0.3 1"
								calcMode="spline"
								repeatCount="indefinite"
							/>
						</>
					)}
				</linearGradient>
			</defs>
		</svg>
	);
}
