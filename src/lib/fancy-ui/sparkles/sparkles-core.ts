// Framework-free engine for Sparkles: canvas 2D particle drift with a
// sine-driven opacity phase. No Svelte imports, no module-scope DOM access.

export interface SparklesElements {
	/** The canvas particles are drawn onto. */
	canvas: HTMLCanvasElement;
	/** The sized host element the canvas fills; used to read layout size on resize. */
	container: HTMLElement;
}

export interface SparklesInitOptions {
	/** Minimum particle radius (CSS px). */
	minSize?: number;
	/** Maximum particle radius (CSS px). */
	maxSize?: number;
	/** Base velocity multiplier applied to every particle. */
	speed?: number;
	/** Particle count generated once at creation. */
	particleDensity?: number;
}

export interface SparklesLiveOptions {
	/** Hex color (e.g. "#ffffff") particles are filled with; re-read every frame. */
	particleColor?: string;
}

export interface SparklesEngine {
	setOptions(next: Partial<SparklesLiveOptions>): void;
	resize(): void;
	destroy(): void;
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

const DEFAULT_MIN_SIZE = 1;
const DEFAULT_MAX_SIZE = 3;
const DEFAULT_SPEED = 4;
const DEFAULT_PARTICLE_DENSITY = 120;
const DEFAULT_PARTICLE_COLOR = "#ffffff";

export function createSparkles(
	elements: SparklesElements,
	options: SparklesInitOptions & SparklesLiveOptions,
	random: () => number = Math.random
): SparklesEngine | null {
	const { canvas, container } = elements;

	let ctx = canvas.getContext("2d");
	if (!ctx) return null;

	const minSize = options.minSize ?? DEFAULT_MIN_SIZE;
	const maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;
	const speed = options.speed ?? DEFAULT_SPEED;
	const particleDensity = options.particleDensity ?? DEFAULT_PARTICLE_DENSITY;
	let particleColor = options.particleColor ?? DEFAULT_PARTICLE_COLOR;

	let particles: Particle[] = [];
	let dpr = 1;
	let rafId = 0;
	let destroyed = false;

	function resize(): void {
		if (destroyed) return;
		dpr = window.devicePixelRatio || 1;
		const rect = container.getBoundingClientRect();
		canvas.width = rect.width * dpr;
		canvas.height = rect.height * dpr;
		ctx = canvas.getContext("2d");
		if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}

	function generateParticles(): void {
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

	function updateAndDraw(): void {
		if (!ctx) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		for (const p of particles) {
			p.x += p.vx;
			p.y += p.vy;
			if (p.x < -2) p.x = 102;
			if (p.x > 102) p.x = -2;
			if (p.y < -2) p.y = 102;
			if (p.y > 102) p.y = -2;
			p.phase = (p.phase + p.phaseSpeed) % (Math.PI * 2);
			const opacity = 0.3 + (Math.sin(p.phase) * 0.3 + 0.3);

			ctx.beginPath();
			// canvas.width/height are device pixels while the context already
			// carries the dpr transform, so divide it back out to draw in CSS pixels.
			ctx.arc((p.x * canvas.width) / (100 * dpr), (p.y * canvas.height) / (100 * dpr), p.size, 0, Math.PI * 2);
			ctx.fillStyle = `${particleColor}${Math.floor(opacity * 255)
				.toString(16)
				.padStart(2, "0")}`;
			ctx.fill();
		}

		rafId = requestAnimationFrame(updateAndDraw);
	}

	resize();
	generateParticles();
	rafId = requestAnimationFrame(updateAndDraw);

	return {
		setOptions(next) {
			if (next.particleColor !== undefined) particleColor = next.particleColor;
		},
		resize,
		destroy() {
			if (destroyed) return;
			destroyed = true;
			cancelAnimationFrame(rafId);
		},
	};
}
