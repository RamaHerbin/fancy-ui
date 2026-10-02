// bg-falling-stars-core.ts — framework-free star-field engine.
//
// Owns the rAF loop, the canvas 2D drawing and the sizing math for the
// falling-stars background. Zero framework imports, no module-scope
// window/document access, no Math.random outside create* (an optional
// `random` param drives it so a future seed prop can reuse this file).

export interface FallingStarsElements {
	/** The canvas the star field is drawn on. */
	canvas: HTMLCanvasElement;
}

/** Props the Svelte wrapper reads only at mount today. */
export interface FallingStarsInitOptions {
	/** Number of stars. */
	count?: number;
}

/** Props the Svelte wrapper reacts to after mount today. */
export interface FallingStarsLiveOptions {
	/** Star color as hex string. */
	color?: string;
}

export interface FallingStarsEngine {
	setOptions(next: Partial<FallingStarsLiveOptions>): void;
	resize(): void;
	destroy(): void;
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

function hexToRgb(hex: string): Rgb {
	let h = (hex || "#000").replace(/^#/, "");
	if (h.length === 3) {
		h = h
			.split("")
			.map((c) => c + c)
			.join("");
	}
	const bigint = parseInt(h, 16) || 0;
	return {
		r: (bigint >> 16) & 255,
		g: (bigint >> 8) & 255,
		b: bigint & 255,
	};
}

/**
 * Create the falling-stars engine. Returns null when a 2D context is not
 * available (fail-quiet, same rule every canvas component follows).
 */
export function createFallingStars(
	el: FallingStarsElements,
	options: FallingStarsInitOptions & FallingStarsLiveOptions,
	random: () => number = Math.random
): FallingStarsEngine | null {
	const { canvas } = el;

	let ctx: CanvasRenderingContext2D | null = canvas.getContext("2d");
	if (!ctx) return null;

	const count = options.count ?? 200;
	let color = options.color ?? "#FFF";
	let cachedRgb = hexToRgb(color);

	let dpr = 1;
	let perspective = 0;
	let stars: Star[] = [];
	let rafId = 0;
	let destroyed = false;

	function resize(): void {
		if (destroyed) return;

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

	function drawStar(star: Star, width: number, height: number): void {
		if (!ctx) return;

		const scale = perspective / (perspective + star.z);
		const x2d = width / 2 + star.x * scale;
		const y2d = height / 2 + star.y * scale;
		const size = Math.max(scale * 3, 0.5);

		const prevScale = perspective / (perspective + star.z + star.speed * 15);
		const xPrev = width / 2 + star.x * prevScale;
		const yPrev = height / 2 + star.y * prevScale;

		const rgb = cachedRgb;

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

	function loop(): void {
		if (destroyed) return;
		if (!ctx) ctx = canvas.getContext("2d");
		if (!ctx) return;

		const width = canvas.clientWidth;
		const height = canvas.clientHeight;

		ctx.clearRect(0, 0, width, height);

		for (let i = 0; i < stars.length; i++) {
			const star = stars[i];
			if (!star) continue;
			drawStar(star, width, height);

			star.z -= star.speed;

			if (star.z <= 0) {
				star.z = width || 1;
				star.x = (random() - 0.5) * 2 * width;
				star.y = (random() - 0.5) * 2 * height;
			}
		}

		rafId = requestAnimationFrame(loop);
	}

	resize();

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

	rafId = requestAnimationFrame(loop);

	return {
		setOptions(next) {
			if (next.color !== undefined) {
				color = next.color;
				cachedRgb = hexToRgb(color);
			}
		},
		resize,
		destroy() {
			if (destroyed) return;
			destroyed = true;
			if (rafId) cancelAnimationFrame(rafId);
		},
	};
}
