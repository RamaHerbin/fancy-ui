import { useEffect, useRef } from "react";
import { cn } from "../../utils.js";
import { useReducedMotion } from "../../internals/motion/media-query.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { createFallingStars, type FallingStarsEngine } from "./bg-falling-stars-core.js";

/**
 * FallingStarsBg - Canvas-based 3D starfield background
 *
 * Stars travel toward the camera through a perspective projection and trail a
 * layered stroke that fakes motion blur. Everything is drawn on a 2D canvas from
 * a `requestAnimationFrame` loop - no CSS or SVG animation - and the canvas is
 * sized from `devicePixelRatio` and kept in sync by a `ResizeObserver`.
 */
export interface FallingStarsBgProps {
	/** Star color: a hex string, or `currentColor` (default) to follow the text colour */
	color?: string;
	/** Number of stars */
	count?: number;
	/** Additional CSS classes */
	className?: string;
	/**
	 * Seed for the starfield. The same seed always lays out and flies the same
	 * sky, which is what keeps the component free of `Math.random()`. Change it
	 * to give two starfields on one page different skies - the default is
	 * shared, so two `<FallingStarsBg />` with no seed show the same sky.
	 */
	seed?: number;
}

/**
 * mulberry32 - a tiny deterministic PRNG, standing in for the `Math.random()`
 * the starfield is seeded and respawned with. The sky is generated inside the
 * mount effect, so it never reaches a server render, but a seeded stream still
 * buys two things a raw `Math.random()` cannot: a sky that comes back identical
 * after a remount, and a draw path a test can assert on frame by frame.
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

export function FallingStarsBg({
	color = "currentColor",
	count = 200,
	className = "",
	seed = 1,
}: FallingStarsBgProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const engineRef = useRef<FallingStarsEngine | null>(null);
	// Reduced motion: one still frame instead of the rAF loop. false on the server
	// and during hydration, then the real preference.
	const reducedMotion = useReducedMotion();

	// Live values reach the running engine through `setOptions`; the creation
	// effect only reads them once, at mount, so they never rebuild the sky.
	const colorRef = useLiveRef(color);
	const reducedMotionRef = useLiveRef(reducedMotion);

	// `count` and `seed` are init-only in the engine, so a change re-initialises
	// the starfield (documented React divergence).
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const engine = createFallingStars(
			{ canvas },
			{ count, color: colorRef.current, reducedMotion: reducedMotionRef.current },
			mulberry32(seed)
		);
		if (!engine) return;

		// The engine does not watch its canvas; resizing wipes the bitmap and the
		// engine repaints an idle (reduced-motion) frame itself.
		const resizeObserver = new ResizeObserver(() => engine.resize());
		resizeObserver.observe(canvas);
		engineRef.current = engine;

		return () => {
			engineRef.current = null;
			resizeObserver.disconnect();
			engine.destroy();
		};
	}, [count, seed, colorRef, reducedMotionRef]);

	// A colour or preference flip keeps the same stars: the engine repaints the
	// idle frame, or resumes the loop where it stopped, instead of re-seeding.
	useEffect(() => {
		engineRef.current?.setOptions({ color, reducedMotion });
	}, [color, reducedMotion]);

	return <canvas ref={canvasRef} className={cn("absolute inset-0 h-full w-full", className)} />;
}
