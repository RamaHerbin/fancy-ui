import { useEffect, useRef } from "react";
import { cn } from "../../utils.js";
import { useReducedMotion } from "../../internals/motion/media-query.js";

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

interface Star {
	x: number;
	y: number;
	z: number;
	speed: number;
}

interface Rgb {
	r: number;
	g: number;
	b: number;
}

const CURRENT_COLOR = /^\s*currentcolor\s*$/i;

function parseHex(hex: string): Rgb {
	let h = (hex || "#000").trim().replace(/^#/, "");
	if (h.length === 3) {
		h = h
			.split("")
			.map((c) => c + c)
			.join("");
	}
	const bigint = parseInt(h, 16) || 0;
	return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

/**
 * Turn the browser's computed `color` into 0-255 channels. The common
 * `rgb()`/`rgba()` serialisation is parsed directly; newer spaces (oklch,
 * color-mix, ...) are rasterised through a 1x1 canvas, which converts them to
 * sRGB for free. Falls back to black when neither works (no canvas backend).
 */
function computedToRgb(computed: string): Rgb {
	const m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(computed);
	if (m) return { r: Math.round(+m[1]!), g: Math.round(+m[2]!), b: Math.round(+m[3]!) };
	if (!computed) return { r: 0, g: 0, b: 0 };
	try {
		const probe = document.createElement("canvas");
		probe.width = probe.height = 1;
		const pctx = probe.getContext("2d", { willReadFrequently: true });
		if (pctx) {
			pctx.fillStyle = computed;
			pctx.fillRect(0, 0, 1, 1);
			const [r = 0, g = 0, b = 0] = pctx.getImageData(0, 0, 1, 1).data;
			return { r, g, b };
		}
	} catch {
		// fall through to the black fallback
	}
	return { r: 0, g: 0, b: 0 };
}

/**
 * Colour resolver: a hex string is parsed once per value, `currentColor` is
 * re-read from `el`'s computed style on every call (so a light/dark switch
 * lands on the next frame) and re-parsed only when that string changes.
 */
function createColorResolver(el: Element) {
	let lastComputed = "";
	let lastRgb: Rgb = { r: 0, g: 0, b: 0 };
	let lastHex = "";
	let lastHexRgb: Rgb = { r: 0, g: 0, b: 0 };
	return (color: string): Rgb => {
		if (CURRENT_COLOR.test(color)) {
			const computed = getComputedStyle(el).color;
			if (computed !== lastComputed) {
				lastComputed = computed;
				lastRgb = computedToRgb(computed);
			}
			return lastRgb;
		}
		if (color !== lastHex) {
			lastHex = color;
			lastHexRgb = parseHex(color);
		}
		return lastHexRgb;
	};
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

	// The Svelte source caches the parsed colour in a `$derived`. Here the
	// running loop reads it through a ref, so a colour change repaints on the
	// next frame instead of tearing the starfield down and re-seeding it.
	const colorRef = useRef(color);
	// Reduced motion: one still frame instead of the rAF loop. A flip restarts the
	// effect below; the same `seed` lays out the same sky, so the picture is stable.
	const reducedMotion = useReducedMotion();
	// Set by the effect while the loop is idle, so a colour change can repaint it.
	const repaintRef = useRef<(() => void) | null>(null);
	useEffect(() => {
		colorRef.current = color;
		repaintRef.current?.();
	}, [color]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const random = mulberry32(seed);
		const resolveColor = createColorResolver(canvas);
		let rgb: Rgb = resolveColor(colorRef.current);
		let perspective = 0;
		let stars: Star[] = [];
		let ctx: CanvasRenderingContext2D | null = null;
		let dpr = 1;
		let rafId = 0;

		function resizeCanvas() {
			if (!canvas) return;

			dpr = window.devicePixelRatio || 1;
			const width = Math.max(1, Math.floor(canvas.clientWidth));
			const height = Math.max(1, Math.floor(canvas.clientHeight));

			canvas.width = Math.floor(width * dpr);
			canvas.height = Math.floor(height * dpr);
			canvas.style.width = `${width}px`;
			canvas.style.height = `${height}px`;

			ctx = canvas.getContext("2d");
			if (ctx) {
				ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			}

			perspective = width / 2;
		}

		function drawStar(star: Star, width: number, height: number) {
			if (!ctx) return;

			const scale = perspective / (perspective + star.z);
			const x2d = width / 2 + star.x * scale;
			const y2d = height / 2 + star.y * scale;
			const size = Math.max(scale * 3, 0.5);

			const prevScale = perspective / (perspective + star.z + star.speed * 15);
			const xPrev = width / 2 + star.x * prevScale;
			const yPrev = height / 2 + star.y * prevScale;

			// Layered strokes from wide+faint to narrow+brighter to fake blur
			const layerAlphas = [0.08, 0.14, 0.22];
			for (let i = 0; i < layerAlphas.length; i++) {
				ctx.beginPath();
				ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${layerAlphas[i]})`;
				ctx.lineWidth = size * (1.4 + i * 1.2);
				ctx.moveTo(x2d, y2d);
				ctx.lineTo(xPrev, yPrev);
				ctx.stroke();
			}

			// Sharp center line
			ctx.beginPath();
			ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`;
			ctx.lineWidth = Math.max(1, size);
			ctx.moveTo(x2d, y2d);
			ctx.lineTo(xPrev, yPrev);
			ctx.stroke();

			// Dot
			ctx.beginPath();
			ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`;
			ctx.arc(x2d, y2d, Math.max(0.5, size / 4), 0, Math.PI * 2);
			ctx.fill();
		}

		function loop() {
			if (!canvas) return;
			if (!ctx) ctx = canvas.getContext("2d");
			if (!ctx) return;

			const width = canvas.clientWidth;
			const height = canvas.clientHeight;

			ctx.clearRect(0, 0, width, height);
			rgb = resolveColor(colorRef.current);

			for (const star of stars) {
				drawStar(star, width, height);

				star.z -= star.speed;

				if (star.z <= 0) {
					star.z = width || 1;
					star.x = (random() - 0.5) * 2 * width;
					star.y = (random() - 0.5) * 2 * height;
				}
			}

			// One still frame under reduced motion: paint, then idle.
			if (reducedMotion) {
				rafId = 0;
				return;
			}
			rafId = requestAnimationFrame(loop);
		}

		resizeCanvas();

		const cssWidth = canvas.clientWidth;
		const cssHeight = canvas.clientHeight;
		stars = [];
		for (let i = 0; i < count; i++) {
			stars.push({
				x: (random() - 0.5) * 2 * cssWidth,
				y: (random() - 0.5) * 2 * cssHeight,
				z: random() * (cssWidth || 1),
				speed: random() * 5 + 2,
			});
		}

		if (reducedMotion) {
			loop();
			repaintRef.current = loop;
		} else {
			rafId = requestAnimationFrame(loop);
		}

		// Resizing wipes the bitmap; an idle (reduced-motion) loop must repaint.
		const resizeObserver = new ResizeObserver(() => {
			resizeCanvas();
			if (reducedMotion) loop();
		});
		resizeObserver.observe(canvas);

		return () => {
			repaintRef.current = null;
			if (rafId) cancelAnimationFrame(rafId);
			resizeObserver.disconnect();
		};
	}, [count, seed, reducedMotion]);

	return <canvas ref={canvasRef} className={cn("absolute inset-0 h-full w-full", className)} />;
}
