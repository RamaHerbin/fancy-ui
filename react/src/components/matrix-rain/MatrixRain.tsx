import { useEffect, useRef } from "react";
import { cn } from "../../utils.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { observeInView } from "../../internals/motion/in-view.js";
import { useReducedMotion } from "../../internals/motion/media-query.js";
import { createMatrixRain, type MatrixRainEngine } from "./matrix-rain-core.js";

/**
 * MatrixRain - Canvas2D "digital rain" background
 *
 * Columns of falling glyphs with a bright leading character and a dimmer
 * trailing one. The trail comes from repeatedly painting a low-opacity black
 * rectangle over the previous frame instead of clearing it, so `fadeOpacity`
 * controls trail length. The canvas fills its parent (`h-full w-full`) and
 * paints its own black background, so size it via a wrapping element.
 *
 * The frame loop pauses while the canvas is scrolled out of view and resumes
 * from the column state it left off at.
 */
export interface MatrixRainProps {
	/** Glyph color */
	color?: string;
	/** Fall speed multiplier (`< 1` slower, `> 1` faster) */
	speed?: number;
	/** Column density multiplier (higher = more, narrower columns) */
	density?: number;
	/** Font size of each glyph in pixels */
	glyphSize?: number;
	/** Opacity of the black overlay painted each frame — controls trail length */
	fadeOpacity?: number;
	/** Additional CSS classes */
	className?: string;
	/**
	 * Seed for the glyph and column-position stream. The same seed always
	 * produces the same rain, which is what makes the effect reproducible in a
	 * test and identical across two mounts of the same instance. Change it to
	 * give two rains on one page different streams — the default is shared, so
	 * two `<MatrixRain />` with no seed start out alike.
	 */
	seed?: number;
}

/**
 * mulberry32 — a tiny deterministic PRNG, standing in for the source's bare
 * `Math.random()`. Seeding costs nothing visually (the same uniform
 * distribution) and buys a rain that can be asserted on frame by frame, which
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

/**
 * `density` in the shared engine's convention.
 *
 * This component documents `density` as "higher = more, narrower columns": the
 * column pitch is `glyphSize / density`. The shared engine multiplies instead
 * (`glyphSize * density`, so a higher value spreads the columns out), which is
 * the behaviour the Svelte and Vue packages ship. The reciprocal turns one into
 * the other, so each package keeps the behaviour it has always had. The floor
 * mirrors the one this component always applied to its own value.
 *
 * Known edge: above `density = 10` the engine's own floor on the converted
 * value (0.1) caps the column count, where this component used to keep adding
 * columns less than two pixels apart.
 */
function toEngineDensity(density: number): number {
	return 1 / Math.max(0.1, density);
}

export function MatrixRain({
	color = "#00ff41",
	speed = 1.0,
	density = 1.0,
	glyphSize = 16,
	fadeOpacity = 0.05,
	className,
	seed = 1,
}: MatrixRainProps) {
	const [canvas, canvasRef] = useElementRef<HTMLCanvasElement>();

	// The rain itself lives in the framework-free engine shared with the Svelte
	// and Vue packages (`matrix-rain-core.ts`, a byte-identical copy).
	const engineRef = useRef<MatrixRainEngine | null>(null);

	// Per-frame appearance. The engine reads these on every frame, so a change
	// is pushed into the running engine (second effect below) and must NOT tear
	// the loop down. The live ref only supplies their value when an engine starts.
	const appearanceRef = useLiveRef({ color, speed, fadeOpacity });

	// Reduced motion: one still frame instead of the rAF loop. A flip restarts the
	// effect below; the same `seed` re-seeds the same columns.
	const reducedMotion = useReducedMotion();

	// A new engine — and with it a freshly seeded stream — whenever the layout
	// (`glyphSize`, `density`), the `seed` or the motion preference changes.
	useEffect(() => {
		if (!canvas) return;

		const engine = createMatrixRain(
			{ canvas },
			{
				...appearanceRef.current,
				glyphSize,
				density: toEngineDensity(density),
				reducedMotion,
			},
			mulberry32(seed)
		);
		// No 2D context (a canvas that cannot paint): nothing to run.
		if (!engine) return;
		engineRef.current = engine;

		const observer = new ResizeObserver(() => engine.resize());
		observer.observe(canvas);

		// A rain used as a page background is off screen most of the time, so the
		// engine stops its loop while `visible` is false and resumes from the
		// column state it left off at. `threshold: 0` — any sliver on screen
		// counts as visible — and `once: false`, because this has to keep
		// reporting both ways. The loop starts before the first observer
		// callback, which lands a task later: a background that is already on
		// screen never holds a blank canvas until then.
		const inViewHandle = observeInView(canvas, {
			once: false,
			threshold: 0,
			onChange: (intersecting) => engine.setOptions({ visible: intersecting }),
		});

		return () => {
			if (engineRef.current === engine) engineRef.current = null;
			inViewHandle.destroy();
			observer.disconnect();
			engine.destroy();
		};
	}, [canvas, glyphSize, density, seed, reducedMotion, appearanceRef]);

	// Applied in place, no relayout. Under reduced motion there is no loop to
	// pick a colour or fade change up, so the engine lays its still out again.
	useEffect(() => {
		engineRef.current?.setOptions({ color, speed, fadeOpacity });
	}, [color, speed, fadeOpacity]);

	return <canvas ref={canvasRef} className={cn("block h-full w-full bg-black", className)} />;
}
