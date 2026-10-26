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
	/** Star color: a hex string, or `currentColor` (default) to follow the text colour. */
	color?: string;
	/**
	 * Reduced-motion preference, owned by the wrapper (the core never reads
	 * `matchMedia`). When true the engine paints one still frame and idles; a
	 * flip back to false resumes the loop.
	 */
	reducedMotion?: boolean;
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
	let color = options.color ?? "currentColor";
	const resolveColor = createColorResolver(canvas);

	let dpr = 1;
	let perspective = 0;
	let stars: Star[] = [];
	let rafId = 0;
	let reducedMotion = options.reducedMotion ?? false;
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

		// Resizing wiped the bitmap; an idle (reduced-motion) engine has no
		// scheduled frame to refill it.
		if (reducedMotion && rafId === 0 && stars.length > 0) loop();
	}

	function drawStar(star: Star, width: number, height: number, rgb: Rgb): void {
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

	function loop(): void {
		if (destroyed) return;
		if (!ctx) ctx = canvas.getContext("2d");
		if (!ctx) return;

		const width = canvas.clientWidth;
		const height = canvas.clientHeight;

		ctx.clearRect(0, 0, width, height);
		const rgb = resolveColor(color);

		for (let i = 0; i < stars.length; i++) {
			const star = stars[i];
			if (!star) continue;
			drawStar(star, width, height, rgb);

			star.z -= star.speed;

			if (star.z <= 0) {
				star.z = width || 1;
				star.x = (random() - 0.5) * 2 * width;
				star.y = (random() - 0.5) * 2 * height;
			}
		}

		// One still frame under reduced motion: paint, then idle until the
		// preference flips back (setOptions wakes the loop).
		if (reducedMotion) {
			rafId = 0;
			return;
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

	if (reducedMotion) loop();
	else rafId = requestAnimationFrame(loop);

	return {
		setOptions(next) {
			if (destroyed) return;
			const wasReduced = reducedMotion;
			if (next.reducedMotion !== undefined) reducedMotion = next.reducedMotion;
			if (next.color !== undefined && next.color !== color) {
				color = next.color;
				// Idle engine: repaint the still frame in the new colour.
				if (reducedMotion && rafId === 0) loop();
			}
			if (wasReduced && !reducedMotion && rafId === 0) {
				rafId = requestAnimationFrame(loop);
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
