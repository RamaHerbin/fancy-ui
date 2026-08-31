import { useEffect } from "react";
import { cn } from "../../utils.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";

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
	/** Particle color */
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

	useEffect(() => {
		if (!container || !canvas) return;

		const random = mulberry32(seed);

		let ctx: CanvasRenderingContext2D | null = null;
		let particles: Particle[] = [];
		let rafId = 0;

		function resizeCanvas() {
			if (!canvas || !container) return;
			const dpr = window.devicePixelRatio || 1;
			const rect = container.getBoundingClientRect();
			canvas.width = rect.width * dpr;
			canvas.height = rect.height * dpr;
			ctx = canvas.getContext("2d");
			if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
					(p.x * canvas.width) / 100,
					(p.y * canvas.height) / 100,
					p.size,
					0,
					Math.PI * 2
				);
				context.fillStyle = `${particleColorRef.current}${Math.floor(opacity * 255)
					.toString(16)
					.padStart(2, "0")}`;
				context.fill();
			}

			rafId = requestAnimationFrame(updateAndDraw);
		}

		ctx = canvas.getContext("2d");
		resizeCanvas();
		generateParticles();
		rafId = requestAnimationFrame(updateAndDraw);

		const resizeObserver = new ResizeObserver(resizeCanvas);
		resizeObserver.observe(container);

		return () => {
			cancelAnimationFrame(rafId);
			resizeObserver.disconnect();
		};
	}, [container, canvas, minSize, maxSize, speed, particleDensity, seed, particleColorRef]);

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
