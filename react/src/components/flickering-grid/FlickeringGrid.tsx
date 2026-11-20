import { useEffect, useRef } from "react";
import { cn } from "../../utils.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { useReducedMotion } from "../../internals/motion/media-query.js";
import { createFlickeringGrid, type FlickeringGridEngine } from "./flickering-grid-core.js";

/**
 * FlickeringGrid - Canvas-based grid with flickering opacity squares
 *
 * Uses ResizeObserver, IntersectionObserver, and requestAnimationFrame
 * for performant rendering with automatic pause when off-screen.
 */
export interface FlickeringGridProps {
	/** Size of each grid square in pixels */
	squareSize?: number;
	/** Gap between squares in pixels */
	gridGap?: number;
	/** Probability of a square changing opacity each second (0-1) */
	flickerChance?: number;
	/** Color of the squares: a hex string, or `currentColor` (default) to follow the text colour */
	color?: string;
	/** Maximum opacity of squares (0-1) */
	maxOpacity?: number;
	/** Fixed width in pixels (defaults to container width) */
	width?: number;
	/** Fixed height in pixels (defaults to container height) */
	height?: number;
	/** Additional CSS classes */
	className?: string;
	/**
	 * Seed for the flicker stream. The same seed always produces the same
	 * sequence of opacities, which is what makes the effect reproducible in a
	 * test and identical across two mounts of the same instance. Change it to
	 * give two grids on one page different flicker — the default is shared, so
	 * two `<FlickeringGrid />` with no seed light up alike.
	 */
	seed?: number;
}

/**
 * mulberry32 — a tiny deterministic PRNG, standing in for the source's bare
 * `Math.random()`. Seeding costs nothing visually (the same uniform
 * distribution) and buys a grid that can be asserted on frame by frame, which
 * an unseeded canvas loop cannot be.
 */
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

export function FlickeringGrid({
	squareSize = 4,
	gridGap = 6,
	flickerChance = 0.3,
	color = "currentColor",
	maxOpacity = 0.3,
	width,
	height,
	className,
	seed = 1,
}: FlickeringGridProps) {
	const [container, containerRef] = useElementRef<HTMLDivElement>();
	const [canvas, canvasRef] = useElementRef<HTMLCanvasElement>();
	const reducedMotion = useReducedMotion();

	// Mount-time values for the engine. A prop change reaches a running engine
	// through `setOptions` below and never rebuilds it: rebuilding would
	// re-seed every square on a colour change.
	const live = useLiveRef({
		squareSize,
		gridGap,
		flickerChance,
		color,
		maxOpacity,
		width,
		height,
		reducedMotion,
	});
	const engineRef = useRef<FlickeringGridEngine | null>(null);

	// `seed` IS a dependency: it defines the stream from its first value on, so
	// changing it has to restart the grid.
	useEffect(() => {
		if (!container || !canvas) return;

		const engine = createFlickeringGrid({ container, canvas }, live.current, mulberry32(seed));
		if (!engine) return;
		engineRef.current = engine;

		const resizeObserver = new ResizeObserver(() => engine.resize());

		const intersectionObserver = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				if (entry) engine.setInView(entry.isIntersecting);
			},
			{ threshold: 0 }
		);

		resizeObserver.observe(container);
		intersectionObserver.observe(canvas);

		return () => {
			resizeObserver.disconnect();
			intersectionObserver.disconnect();
			engine.destroy();
			if (engineRef.current === engine) engineRef.current = null;
		};
	}, [container, canvas, seed, live]);

	// Declared after the creation effect so the first push finds the engine.
	useEffect(() => {
		engineRef.current?.setOptions({
			squareSize,
			gridGap,
			flickerChance,
			color,
			maxOpacity,
			width,
			height,
			reducedMotion,
		});
	}, [squareSize, gridGap, flickerChance, color, maxOpacity, width, height, reducedMotion]);

	return (
		<div ref={containerRef} className={cn("h-full w-full", className)}>
			<canvas ref={canvasRef} className="pointer-events-none" />
		</div>
	);
}
