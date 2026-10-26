/**
 * FlickeringGrid engine — framework-free canvas core.
 *
 * Draws a grid of squares whose opacity randomly flickers over time. The
 * wrapper owns markup, a11y, IntersectionObserver visibility gating and
 * ResizeObserver wiring; this core owns the rAF loop and the 2D drawing.
 */

export interface FlickeringGridElements {
	/** The element the canvas is sized against when width/height are not set. */
	container: HTMLDivElement;
	canvas: HTMLCanvasElement;
}

// No props are read only-at-mount today: every prop is re-read from the
// (Svelte 5) closure on every animation frame, so all of them are live.
export interface FlickeringGridInitOptions {}

export interface FlickeringGridLiveOptions {
	/** Size of each grid square in pixels */
	squareSize?: number;
	/** Gap between squares in pixels */
	gridGap?: number;
	/** Probability of a square changing opacity each second (0-1) */
	flickerChance?: number;
	/** Color of the squares: a hex string, or `currentColor` (default) to follow the text colour */
	color?: string;
	/** Maximum opacity of squares (0-1) */
	maxOpacity?: number;
	/** Fixed width in pixels (defaults to container width) */
	width?: number;
	/** Fixed height in pixels (defaults to container height) */
	height?: number;
	/**
	 * Reduced-motion preference, owned by the wrapper (the core never reads
	 * `matchMedia`). When true the grid paints one still frame while in view and
	 * idles; a flip back to false resumes the flicker.
	 */
	reducedMotion?: boolean;
}

export interface FlickeringGridEngine {
	setOptions(next: Partial<FlickeringGridLiveOptions>): void;
	/**
	 * Mirrors the IntersectionObserver callback the wrapper owns: starts/stops
	 * the rAF loop. Scheduling is unconditional while in view, exactly as the
	 * original observer callback was; `destroy()` makes it inert.
	 */
	setInView(isInView: boolean): void;
	resize(): void;
	destroy(): void;
}

const DEFAULTS: Omit<Required<FlickeringGridLiveOptions>, "width" | "height" | "reducedMotion"> = {
	squareSize: 4,
	gridGap: 6,
	flickerChance: 0.3,
	color: "currentColor",
	maxOpacity: 0.3,
};

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

export function createFlickeringGrid(
	el: FlickeringGridElements,
	options: FlickeringGridInitOptions & FlickeringGridLiveOptions,
	random: () => number = Math.random
): FlickeringGridEngine | null {
	const ctx = el.canvas.getContext("2d");
	if (!ctx) return null;

	const opts: Omit<Required<FlickeringGridLiveOptions>, "width" | "height" | "reducedMotion"> &
		Pick<FlickeringGridLiveOptions, "width" | "height" | "reducedMotion"> = {
		...DEFAULTS,
		...options,
	};

	let isInView = false;
	let animationFrameId: number | undefined;
	let lastTime = 0;
	let cols = 0;
	let rows = 0;
	let squares: Float32Array = new Float32Array(0);
	let dpr = 1;
	let destroyed = false;
	const resolveColor = createColorResolver(el.container);

	function setupCanvas(w: number, h: number) {
		dpr = window.devicePixelRatio || 1;
		el.canvas.width = w * dpr;
		el.canvas.height = h * dpr;
		el.canvas.style.width = `${w}px`;
		el.canvas.style.height = `${h}px`;

		cols = Math.floor(w / (opts.squareSize + opts.gridGap));
		rows = Math.floor(h / (opts.squareSize + opts.gridGap));

		squares = new Float32Array(cols * rows);
		for (let i = 0; i < squares.length; i++) {
			squares[i] = random() * opts.maxOpacity;
		}
	}

	function updateSquares(deltaTime: number) {
		for (let i = 0; i < squares.length; i++) {
			if (random() < opts.flickerChance * deltaTime) {
				squares[i] = random() * opts.maxOpacity;
			}
		}
	}

	function drawGrid() {
		const { r, g, b } = resolveColor(opts.color);
		const colorPrefix = `rgba(${r}, ${g}, ${b},`;
		// Non-null: `ctx` was checked once at create-time and canvas 2D contexts never become null after creation.
		ctx!.clearRect(0, 0, el.canvas.width, el.canvas.height);
		for (let i = 0; i < cols; i++) {
			for (let j = 0; j < rows; j++) {
				const opacity = squares[i * rows + j];
				ctx!.fillStyle = `${colorPrefix}${opacity})`;
				ctx!.fillRect(
					i * (opts.squareSize + opts.gridGap) * dpr,
					j * (opts.squareSize + opts.gridGap) * dpr,
					opts.squareSize * dpr,
					opts.squareSize * dpr
				);
			}
		}
	}

	function updateCanvasSize() {
		const w = opts.width ?? el.container.clientWidth;
		const h = opts.height ?? el.container.clientHeight;
		setupCanvas(w, h);
	}

	function animate(time: number) {
		// `destroyed` is the only addition to the original guard: it stops any frame
		// still queued at teardown (including one from a stacked loop, which the
		// original leaked past unmount) as the engine contract requires.
		if (!isInView || destroyed) return;

		const deltaTime = (time - lastTime) / 1000;
		lastTime = time;

		// One still frame under reduced motion: the squares keep their seeded
		// opacities (no flicker), paint once, then idle until the preference
		// flips back or the grid re-enters the viewport.
		if (opts.reducedMotion) {
			drawGrid();
			animationFrameId = undefined;
			return;
		}

		updateSquares(deltaTime);
		drawGrid();
		animationFrameId = requestAnimationFrame(animate);
	}

	/** Repaint the still frame of an idle (reduced-motion, in-view) engine. */
	function repaintIdle() {
		if (opts.reducedMotion && isInView && animationFrameId === undefined) drawGrid();
	}

	updateCanvasSize();

	return {
		setOptions(next) {
			if (destroyed) return;
			const wasReduced = opts.reducedMotion;
			Object.assign(opts, next);
			if (wasReduced && !opts.reducedMotion) {
				if (isInView && animationFrameId === undefined) {
					animationFrameId = requestAnimationFrame(animate);
				}
			} else {
				repaintIdle();
			}
		},
		setInView(nextIsInView) {
			// Faithful to the original IntersectionObserver callback: assign, then
			// schedule unconditionally while in view (no de-duplication guard — the
			// original stacked a second loop if two `isIntersecting: true` callbacks
			// arrived in a row, and, above all, always restarted on re-entry).
			if (destroyed) return;
			isInView = nextIsInView;
			if (isInView) {
				animationFrameId = requestAnimationFrame(animate);
			}
		},
		resize() {
			if (destroyed) return;
			updateCanvasSize();
			repaintIdle();
		},
		destroy() {
			if (destroyed) return;
			destroyed = true;
			if (animationFrameId !== undefined) {
				cancelAnimationFrame(animationFrameId);
				animationFrameId = undefined;
			}
		},
	};
}
