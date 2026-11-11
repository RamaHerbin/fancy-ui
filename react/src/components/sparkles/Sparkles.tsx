import { useEffect, useRef } from "react";
import { cn } from "../../utils.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { useReducedMotion } from "../../internals/motion/media-query.js";
import { createSparkles, type SparklesEngine } from "./sparkles-core.js";

/**
 * Sparkles - canvas-based floating particle sparkle effect
 *
 * Particles drift across a percentage-space field (0-100 on both axes, wrapping
 * at -2/102) and pulse their alpha off a per-particle sine phase. Everything is
 * drawn on a 2D canvas from a `requestAnimationFrame` loop; the canvas is sized
 * from the container's `getBoundingClientRect()` scaled by `devicePixelRatio`
 * and kept in sync by a `ResizeObserver` on the container.
 *
 * The component fills its parent (`size-full`), so give the parent a height.
 */
export interface SparklesProps {
	/** Background color */
	background?: string;
	/** Particle color: a hex string, or `currentColor` to follow the text colour */
	particleColor?: string;
	/** Minimum particle size */
	minSize?: number;
	/** Maximum particle size */
	maxSize?: number;
	/** Particle movement speed */
	speed?: number;
	/** Number of particles */
	particleDensity?: number;
	/** Additional CSS classes */
	className?: string;
	/**
	 * Seed for the particle field. The same seed always lays out and drifts the
	 * same sparkles, which is what keeps the component free of `Math.random()`.
	 * Change it to give two fields on one page different sparkles - the default
	 * is shared, so two `<Sparkles />` with no seed show the same field.
	 */
	seed?: number;
}

/**
 * mulberry32 - a tiny deterministic PRNG, standing in for the source's bare
 * `Math.random()`. Same uniform distribution, so the field looks identical, but
 * a seeded stream buys a field that comes back the same after a remount and a
 * draw path a test can assert on frame by frame.
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

export function Sparkles({
	background = "#0d47a1",
	particleColor = "#ffffff",
	minSize = 1,
	maxSize = 3,
	speed = 4,
	particleDensity = 120,
	className = "",
	seed = 1,
}: SparklesProps) {
	const [container, containerRef] = useElementRef<HTMLDivElement>();
	const [canvas, canvasRef] = useElementRef<HTMLCanvasElement>();
	const engineRef = useRef<SparklesEngine | null>(null);

	// Mount-time values the engine reads once; a change to either must not rebuild
	// the field (colour and reduced motion are pushed through `setOptions` below).
	const reducedMotion = useReducedMotion();
	const particleColorRef = useLiveRef(particleColor);
	const reducedMotionRef = useLiveRef(reducedMotion);

	// The five props that shape the field are init-only in the engine, so they
	// (and `seed`) stay dependencies: changing one regenerates the field.
	useEffect(() => {
		if (!container || !canvas) return;

		const engine = createSparkles(
			{ canvas, container },
			{
				minSize,
				maxSize,
				speed,
				particleDensity,
				particleColor: particleColorRef.current,
				reducedMotion: reducedMotionRef.current,
			},
			mulberry32(seed)
		);
		engineRef.current = engine;

		// The engine does not own the observer: a size change re-fits the canvas.
		const resizeObserver = new ResizeObserver(() => engine?.resize());
		resizeObserver.observe(container);

		return () => {
			resizeObserver.disconnect();
			engine?.destroy();
			if (engineRef.current === engine) engineRef.current = null;
		};
	}, [
		container,
		canvas,
		minSize,
		maxSize,
		speed,
		particleDensity,
		seed,
		particleColorRef,
		reducedMotionRef,
	]);

	// Live options. On mount these repeat what the engine started with, which is
	// a no-op for it; a later flip repaints the still frame or resumes the drift
	// without re-seeding the field.
	useEffect(() => {
		engineRef.current?.setOptions({ particleColor, reducedMotion });
	}, [particleColor, reducedMotion]);

	return (
		<div
			ref={containerRef}
			className={cn("relative size-full overflow-hidden will-change-transform", className)}
			style={{ background }}
		>
			<canvas ref={canvasRef} className="absolute inset-0 size-full" aria-hidden="true" />
		</div>
	);
}
