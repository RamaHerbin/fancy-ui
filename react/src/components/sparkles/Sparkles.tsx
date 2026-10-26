import { useEffect, useRef } from "react";
import { cn } from "../../utils.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { useReducedMotion } from "../../internals/motion/media-query.js";

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

interface Particle {
	x: number;
	y: number;
	size: number;
	opacity: number;
	vx: number;
	vy: number;
	phase: number;
	phaseSpeed: number;
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

const CURRENT_COLOR = /^\s*currentcolor\s*$/i;

/**
 * Resolve `currentColor` to a `#rrggbb` string from `el`'s computed text colour
 * (the particle loop appends a hex alpha byte, so it needs hex). The common
 * `rgb()`/`rgba()` serialisation is parsed directly; newer spaces are
 * rasterised through a 1x1 canvas. Any other value is returned unchanged.
 */
function resolveCurrentColor(color: string, el: Element): string {
	if (!CURRENT_COLOR.test(color)) return color;
	const computed = getComputedStyle(el).color;
	let r = 0;
	let g = 0;
	let b = 0;
	const m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(computed);
	if (m) {
		r = Math.round(+m[1]!);
		g = Math.round(+m[2]!);
		b = Math.round(+m[3]!);
	} else if (computed) {
		try {
			const probe = document.createElement("canvas");
			probe.width = probe.height = 1;
			const pctx = probe.getContext("2d", { willReadFrequently: true });
			if (pctx) {
				pctx.fillStyle = computed;
				pctx.fillRect(0, 0, 1, 1);
				[r = 0, g = 0, b = 0] = pctx.getImageData(0, 0, 1, 1).data;
			}
		} catch {
			// keep the black fallback
		}
	}
	return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
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

	// Read inside the running loop only. The source's `updateAndDraw` reads
	// `particleColor` through the rune getter on every frame, so a colour change
	// must repaint on the next frame rather than tear the field down and re-seed
	// it. The other five props are read synchronously by `generateParticles()`,
	// which is why they are effect dependencies below.
	const particleColorRef = useLiveRef(particleColor);

	// Reduced motion: one still frame instead of the rAF loop. A flip restarts the
	// effect below; the same `seed` re-seeds the same particles.
	const reducedMotion = useReducedMotion();
	// Set by the effect while the loop is idle, so a colour change can repaint it.
	const repaintRef = useRef<(() => void) | null>(null);
	useEffect(() => {
		repaintRef.current?.();
	}, [particleColor]);

	useEffect(() => {
		if (!container || !canvas) return;

		const random = mulberry32(seed);

		let ctx: CanvasRenderingContext2D | null = null;
		let particles: Particle[] = [];
		let rafId = 0;
		// Kept alongside the backing store because the context transform below
		// puts the draw calls in CSS-pixel space while `canvas.width` counts
		// device pixels; the draw site divides by it to stay in the same space.
		let dpr = 1;

		function resizeCanvas() {
			if (!canvas || !container) return;
			dpr = window.devicePixelRatio || 1;
			const rect = container.getBoundingClientRect();
			canvas.width = rect.width * dpr;
			canvas.height = rect.height * dpr;
			ctx = canvas.getContext("2d");
			if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			// Resizing wiped the bitmap; an idle (reduced-motion) loop has no queued
			// frame to refill it.
			if (reducedMotion && particles.length > 0) updateAndDraw();
		}

		function generateParticles() {
			particles = [];
			for (let i = 0; i < particleDensity; i++) {
				const baseSpeed = 0.05;
				const speedVariance = random() * 0.3 + 0.7;
				particles.push({
					x: random() * 100,
					y: random() * 100,
					size: random() * (maxSize - minSize) + minSize,
					opacity: random() * 0.5 + 0.3,
					vx: (random() - 0.5) * baseSpeed * speedVariance * speed,
					vy: ((random() - 0.5) * baseSpeed - baseSpeed * 0.3) * speedVariance * speed,
					phase: random() * Math.PI * 2,
					phaseSpeed: 0.015,
				});
			}
		}

		function updateAndDraw() {
			// Local alias, because `ctx` is reassigned by `resizeCanvas` and
			// TypeScript will not carry a null check on an outer `let` into the
			// draw calls below. Same value, same guard as the source.
			const context = ctx;
			if (!context || !canvas) return;
			context.clearRect(0, 0, canvas.width, canvas.height);
			const fill = resolveCurrentColor(particleColorRef.current, canvas);

			for (const p of particles) {
				p.x += p.vx;
				p.y += p.vy;
				if (p.x < -2) p.x = 102;
				if (p.x > 102) p.x = -2;
				if (p.y < -2) p.y = 102;
				if (p.y > 102) p.y = -2;
				p.phase = (p.phase + p.phaseSpeed) % (Math.PI * 2);
				const opacity = 0.3 + (Math.sin(p.phase) * 0.3 + 0.3);

				context.beginPath();
				context.arc(
					(p.x / 100) * (canvas.width / dpr),
					(p.y / 100) * (canvas.height / dpr),
					p.size,
					0,
					Math.PI * 2
				);
				context.fillStyle = `${fill}${Math.floor(opacity * 255)
					.toString(16)
					.padStart(2, "0")}`;
				context.fill();
			}

			// One still frame under reduced motion: paint, then idle.
			if (reducedMotion) {
				rafId = 0;
				return;
			}
			rafId = requestAnimationFrame(updateAndDraw);
		}

		ctx = canvas.getContext("2d");
		resizeCanvas();
		generateParticles();
		if (reducedMotion) {
			updateAndDraw();
			repaintRef.current = updateAndDraw;
		} else {
			rafId = requestAnimationFrame(updateAndDraw);
		}

		const resizeObserver = new ResizeObserver(resizeCanvas);
		resizeObserver.observe(container);

		return () => {
			repaintRef.current = null;
			cancelAnimationFrame(rafId);
			resizeObserver.disconnect();
		};
	}, [
		container,
		canvas,
		minSize,
		maxSize,
		speed,
		particleDensity,
		seed,
		reducedMotion,
		particleColorRef,
	]);

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
