// Framework-free engine for Sparkles: canvas 2D particle drift with a
// sine-driven opacity phase. No Svelte imports, no module-scope DOM access.

/**
 * Frame subscription, injected by the wrapper (it is the shared frame ticker).
 * Injected rather than imported so this file stays byte-identical in every
 * package tree, whatever the relative path to the ticker is there.
 */
export type FrameSubscribe = (opts: { el?: Element; onFrame(dt: number, now: number): void }) => {
	setPaused(paused: boolean): void;
	unsubscribe(): void;
};

export interface SparklesElements {
	/** The canvas particles are drawn onto. */
	canvas: HTMLCanvasElement;
	/** The sized host element the canvas fills; used to read layout size on resize. */
	container: HTMLElement;
	subscribe: FrameSubscribe;
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
	/** Hex color (e.g. "#ffffff") or `currentColor` particles are filled with; resolved lazily, not per frame. */
	particleColor?: string;
	/**
	 * Reduced-motion preference, owned by the wrapper (the core never reads
	 * `matchMedia`). When true the engine paints one still frame and idles; a
	 * flip back to false resumes the drift.
	 */
	reducedMotion?: boolean;
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

export function createSparkles(
	elements: SparklesElements,
	options: SparklesInitOptions & SparklesLiveOptions,
	random: () => number = Math.random
): SparklesEngine | null {
	const { canvas, container, subscribe } = elements;

	let ctx = canvas.getContext("2d");
	if (!ctx) return null;

	const minSize = options.minSize ?? DEFAULT_MIN_SIZE;
	const maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;
	const speed = options.speed ?? DEFAULT_SPEED;
	const particleDensity = options.particleDensity ?? DEFAULT_PARTICLE_DENSITY;
	let particleColor = options.particleColor ?? DEFAULT_PARTICLE_COLOR;

	let particles: Particle[] = [];
	let dpr = 1;
	// The ticker subscription. Created lazily so a reduced-motion mount never
	// requests a frame; parked, not removed, while the still frame is shown.
	let sub: ReturnType<FrameSubscribe> | null = null;
	// Resolved fill colour. `getComputedStyle` stays out of the per-frame path:
	// null means "resolve on the next paint". Invalidated by a colour change, by
	// the theme observer below and by every resume (a frame with dt 0).
	let fill: string | null = null;
	let reducedMotion = options.reducedMotion ?? false;
	let destroyed = false;

	function resize(): void {
		if (destroyed) return;
		dpr = Math.min(2, window.devicePixelRatio || 1);
		const rect = container.getBoundingClientRect();
		canvas.width = rect.width * dpr;
		canvas.height = rect.height * dpr;
		ctx = canvas.getContext("2d");
		if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		// Resizing wiped the bitmap; an idle (reduced-motion) engine has no
		// scheduled frame to refill it.
		if (reducedMotion && particles.length > 0) paint(0);
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

	// Draws one frame. Velocities and the phase rate are per-60 Hz-frame
	// constants, so the step scales by `dt * 60`: the same look at 60 Hz, the
	// same speed at any other refresh rate.
	function paint(dt: number): void {
		if (!ctx) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		fill ??= resolveCurrentColor(particleColor, canvas);
		const k = dt * 60;

		for (const p of particles) {
			p.x += p.vx * k;
			p.y += p.vy * k;
			if (p.x < -2) p.x = 102;
			if (p.x > 102) p.x = -2;
			if (p.y < -2) p.y = 102;
			if (p.y > 102) p.y = -2;
			p.phase = (p.phase + p.phaseSpeed * k) % (Math.PI * 2);
			const opacity = 0.3 + (Math.sin(p.phase) * 0.3 + 0.3);

			ctx.beginPath();
			// canvas.width/height are device pixels while the context already
			// carries the dpr transform, so divide it back out to draw in CSS pixels.
			ctx.arc(
				(p.x * canvas.width) / (100 * dpr),
				(p.y * canvas.height) / (100 * dpr),
				p.size,
				0,
				Math.PI * 2
			);
			ctx.fillStyle = `${fill}${Math.floor(opacity * 255)
				.toString(16)
				.padStart(2, "0")}`;
			ctx.fill();
		}
	}

	function onFrame(dt: number): void {
		if (destroyed) return;
		// dt is 0 on the first frame and on every resume: the page may have
		// changed theme while the loop was parked.
		if (dt === 0) fill = null;
		paint(dt);
		// One still frame under reduced motion: paint, then park until the
		// preference flips back (setOptions wakes the loop).
		if (reducedMotion) sub?.setPaused(true);
	}

	function startLoop(): void {
		if (sub) sub.setPaused(false);
		else sub = subscribe({ el: canvas, onFrame });
	}

	resize();
	generateParticles();
	if (reducedMotion) paint(0);
	else startLoop();

	// Under reduced motion no frame re-reads `currentColor`, so a theme switch
	// (a class flip on <html>, the way dark mode is usually toggled) would leave
	// the still frame in the old colour. Repaint the idle frame when that
	// happens; the live loop already picks the new colour up on its next frame.
	const themeObserver =
		typeof MutationObserver !== "undefined"
			? new MutationObserver(() => {
					if (!CURRENT_COLOR.test(particleColor)) return;
					fill = null;
					if (reducedMotion) paint(0);
				})
			: null;
	themeObserver?.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ["class"],
	});

	return {
		setOptions(next) {
			if (destroyed) return;
			const wasReduced = reducedMotion;
			if (next.reducedMotion !== undefined) reducedMotion = next.reducedMotion;
			if (next.particleColor !== undefined && next.particleColor !== particleColor) {
				particleColor = next.particleColor;
				fill = null;
				// Idle engine: repaint the still frame in the new colour.
				if (reducedMotion) paint(0);
			}
			if (wasReduced && !reducedMotion) startLoop();
		},
		resize,
		destroy() {
			if (destroyed) return;
			destroyed = true;
			themeObserver?.disconnect();
			sub?.unsubscribe();
			sub = null;
		},
	};
}
