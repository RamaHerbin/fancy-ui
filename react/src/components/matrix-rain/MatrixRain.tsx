import { useEffect, useRef } from "react";
import { cn } from "../../utils.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { observeInView } from "../../internals/motion/in-view.js";
import { useReducedMotion } from "../../internals/motion/media-query.js";

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

const GLYPHS =
	"アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&";

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

// Steps simulated (no rAF) before the single reduced-motion paint. One step
// advances every column by a row, so ~80 steps is a few screen heights of drops:
// every column has fallen, left its fade trail and (2.5% per step once below the
// bottom) restarted, which is the dense wall the live loop settles into. The
// stream is seeded, so the still stays deterministic.
const STILL_PRE_ROLL_STEPS = 80;

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

	// Read inside the running loop only. The Svelte `$effect` reads these three
	// exclusively from `draw()`, which runs from a rAF callback and is therefore
	// outside its tracking context — so they must NOT tear the loop down and
	// restart it when they change. `glyphSize` and `density` are read
	// synchronously by `init()` in the effect body, which is why they ARE effect
	// dependencies below: changing either genuinely re-columns the rain.
	const colorRef = useLiveRef(color);
	const speedRef = useLiveRef(speed);
	const fadeOpacityRef = useLiveRef(fadeOpacity);

	// Component-scoped in the source (`let frameCount = 0`), so it survives a
	// re-init rather than restarting the `speed < 1` frame-skip phase.
	const frameCountRef = useRef(0);

	// Reduced motion: one still frame instead of the rAF loop. A flip restarts the
	// effect below; the same `seed` re-seeds the same columns.
	const reducedMotion = useReducedMotion();

	// Set by the effect below while it holds an idle still frame, so a colour or
	// fade change can lay that still out again without tearing the effect down.
	const repaintStillRef = useRef<(() => void) | null>(null);
	const stillStyleRef = useRef({ color, fadeOpacity });

	useEffect(() => {
		if (!canvas) return;

		const context = canvas.getContext("2d");
		if (!context) return;
		// Re-bound with an explicit non-null type: `draw()` is a hoisted function
		// declaration, and TypeScript does not carry the null check above into one.
		const ctx: CanvasRenderingContext2D = context;

		const random = mulberry32(seed);

		const safeGlyphSize = Math.max(1, glyphSize);
		const safeDensity = Math.max(0.1, density);
		// Horizontal distance between two columns. `density` is documented as
		// "higher = more, narrower columns", so it DIVIDES the glyph width here:
		// doubling it halves the pitch, which both doubles the column count and
		// packs the streams tighter. The Svelte source multiplies instead, which
		// makes a higher density produce fewer, wider columns — the opposite of
		// what its own README describes. Deliberate divergence: the contract wins.
		const columnPitch = safeGlyphSize / safeDensity;

		let columns: number[] = [];
		let canvasW = 0;
		let canvasH = 0;
		let rafId = 0;

		// `charAt` rather than `GLYPHS[i]`: index-identical for every character
		// in the set, and typed `string` under `noUncheckedIndexedAccess`.
		function randomGlyph(): string {
			return GLYPHS.charAt(Math.floor(random() * GLYPHS.length));
		}

		function init(w: number, h: number) {
			const colCount = Math.max(1, Math.floor(w / columnPitch));
			columns = Array.from({ length: colCount }, () => Math.floor(random() * (h / safeGlyphSize)));
		}

		function step() {
			const w = canvasW;
			const h = canvasH;

			const currentColor = colorRef.current;
			const currentSpeed = speedRef.current;
			const currentFadeOpacity = fadeOpacityRef.current;

			// Fade trail
			ctx.fillStyle = `rgba(0, 0, 0, ${currentFadeOpacity})`;
			ctx.fillRect(0, 0, w, h);

			ctx.font = `${glyphSize}px monospace`;
			ctx.shadowBlur = 8;
			ctx.shadowColor = currentColor;

			const rowsPerFrame = Math.max(1, currentSpeed);
			frameCountRef.current++;

			// Only advance every N frames to control speed below 1x
			const shouldAdvance =
				currentSpeed >= 1 || frameCountRef.current % Math.round(1 / currentSpeed) === 0;

			if (shouldAdvance) {
				for (let i = 0; i < columns.length; i++) {
					const row = columns[i] as number;
					const x = i * columnPitch;
					const y = row * glyphSize;

					// Head character (bright white)
					ctx.fillStyle = "#ffffff";
					ctx.fillText(randomGlyph(), x, y);

					// Body glyph one step behind (dimmer)
					if (row > 1) {
						ctx.fillStyle = currentColor;
						ctx.fillText(randomGlyph(), x, y - glyphSize);
					}

					// Reset column when it exits bottom, with random delay
					if (y > h && random() > 0.975) {
						columns[i] = 0;
					} else {
						columns[i] = row + rowsPerFrame;
					}
				}
			}

			ctx.shadowBlur = 0;
		}

		function draw() {
			step();
			// One frame under reduced motion only if the preference flipped while a
			// frame was queued: paint it, then idle.
			if (reducedMotion) {
				rafId = 0;
				return;
			}
			rafId = requestAnimationFrame(draw);
		}

		// Pre-rolls the simulation, then leaves the canvas holding one still frame.
		function paintStill() {
			for (let i = 0; i < STILL_PRE_ROLL_STEPS; i++) step();
		}

		// A queued frame is the loop's only "is it running" state, so `0` is the
		// idle sentinel — a real frame id is never 0. `start()` is therefore
		// safe to call again while the loop is already running.
		function start() {
			if (rafId !== 0) return;
			rafId = requestAnimationFrame(draw);
		}

		function stop() {
			if (rafId === 0) return;
			cancelAnimationFrame(rafId);
			rafId = 0;
		}

		// Set canvas size to container size with HiDPI scaling
		const resize = () => {
			const dpr = window.devicePixelRatio || 1;
			canvasW = canvas.clientWidth;
			canvasH = canvas.clientHeight;
			canvas.width = Math.floor(canvasW * dpr);
			canvas.height = Math.floor(canvasH * dpr);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.fillStyle = "black";
			ctx.fillRect(0, 0, canvasW, canvasH);
			init(canvasW, canvasH);
			// The repaint above wiped the canvas; an idle (reduced-motion) loop has
			// no queued frame to refill it, so paint the still frame now.
			if (reducedMotion) paintStill();
		};

		// Under reduced motion `resize()` paints the one still frame itself.
		resize();

		if (reducedMotion) {
			repaintStillRef.current = () => {
				ctx.fillStyle = "black";
				ctx.fillRect(0, 0, canvasW, canvasH);
				init(canvasW, canvasH);
				paintStill();
			};
		}

		const observer = new ResizeObserver(resize);
		observer.observe(canvas);

		if (!reducedMotion) start();

		// A rain used as a page background is off screen most of the time, and
		// every frame it paints there costs a full-canvas `fillRect` plus two
		// shadow-blurred `fillText` per column for nothing. Pause the loop while
		// the canvas is out of view and resume it on the way back: the trail is
		// an accumulation of fades over whatever is already on the canvas, so
		// resuming from the current column state needs no re-init and shows no
		// seam. `threshold: 0` — any sliver on screen counts as visible — and
		// `once: false`, because this has to keep reporting both ways.
		//
		// The loop still starts immediately rather than waiting for the first
		// observer callback: that callback lands a task later, and a background
		// that is already on screen should not hold a blank canvas until then.
		const inViewHandle = observeInView(canvas, {
			once: false,
			threshold: 0,
			onChange: (intersecting) => {
				if (intersecting) {
					if (!reducedMotion) start();
				} else stop();
			},
		});

		return () => {
			repaintStillRef.current = null;
			stop();
			inViewHandle.destroy();
			observer.disconnect();
		};
	}, [canvas, glyphSize, density, seed, reducedMotion, colorRef, speedRef, fadeOpacityRef]);

	// A colour or fade change is state, not motion: under reduce there is no loop
	// to pick it up, so repaint the idle still frame with the new values.
	useEffect(() => {
		const prev = stillStyleRef.current;
		if (prev.color === color && prev.fadeOpacity === fadeOpacity) return;
		stillStyleRef.current = { color, fadeOpacity };
		repaintStillRef.current?.();
	}, [color, fadeOpacity]);

	return <canvas ref={canvasRef} className={cn("block h-full w-full bg-black", className)} />;
}
