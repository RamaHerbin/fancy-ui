import { useEffect, useRef } from "react";
import { cn } from "../../utils.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";

/**
 * MatrixRain - Canvas2D "digital rain" background
 *
 * Columns of falling glyphs with a bright leading character and a dimmer
 * trailing one. The trail comes from repeatedly painting a low-opacity black
 * rectangle over the previous frame instead of clearing it, so `fadeOpacity`
 * controls trail length. The canvas fills its parent (`h-full w-full`) and
 * paints its own black background, so size it via a wrapping element.
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

	useEffect(() => {
		if (!canvas) return;

		const context = canvas.getContext("2d");
		if (!context) return;
		// Re-bound with an explicit non-null type: `draw()` is a hoisted function
		// declaration, and TypeScript does not carry the null check above into one.
		const ctx: CanvasRenderingContext2D = context;

		const random = mulberry32(seed);

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
			const safeGlyphSize = Math.max(1, glyphSize);
			const safeDensity = Math.max(0.1, density);
			const colCount = Math.max(1, Math.floor(w / (safeGlyphSize * safeDensity)));
			columns = Array.from({ length: colCount }, () =>
				Math.floor(random() * (h / safeGlyphSize))
			);
		}

		function draw() {
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
					const x = i * glyphSize * density;
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
			rafId = requestAnimationFrame(draw);
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
		};

		resize();

		const observer = new ResizeObserver(resize);
		observer.observe(canvas);

		rafId = requestAnimationFrame(draw);

		return () => {
			cancelAnimationFrame(rafId);
			observer.disconnect();
		};
	}, [canvas, glyphSize, density, seed, colorRef, speedRef, fadeOpacityRef]);

	return <canvas ref={canvasRef} className={cn("block h-full w-full bg-black", className)} />;
}
