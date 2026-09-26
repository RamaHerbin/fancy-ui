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
	/** Color of the squares (hex format) */
	color?: string;
	/** Maximum opacity of squares (0-1) */
	maxOpacity?: number;
	/** Fixed width in pixels (defaults to container width) */
	width?: number;
	/** Fixed height in pixels (defaults to container height) */
	height?: number;
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

const DEFAULTS: Omit<Required<FlickeringGridLiveOptions>, "width" | "height"> = {
	squareSize: 4,
	gridGap: 6,
	flickerChance: 0.3,
	color: "#000000",
	maxOpacity: 0.3,
};

function hexToRgba(hex: string): string {
	const clean = hex.replace(/^#/, "");
	const bigint = Number.parseInt(clean, 16);
	const r = (bigint >> 16) & 255;
	const g = (bigint >> 8) & 255;
	const b = bigint & 255;
	return `rgba(${r}, ${g}, ${b},`;
}

export function createFlickeringGrid(
	el: FlickeringGridElements,
	options: FlickeringGridInitOptions & FlickeringGridLiveOptions,
	random: () => number = Math.random
): FlickeringGridEngine | null {
	const ctx = el.canvas.getContext("2d");
	if (!ctx) return null;

	const opts: Omit<Required<FlickeringGridLiveOptions>, "width" | "height"> &
		Pick<FlickeringGridLiveOptions, "width" | "height"> = { ...DEFAULTS, ...options };

	let isInView = false;
	let animationFrameId: number | undefined;
	let lastTime = 0;
	let cols = 0;
	let rows = 0;
	let squares: Float32Array = new Float32Array(0);
	let dpr = 1;
	let destroyed = false;

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
		const colorPrefix = hexToRgba(opts.color);
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

		updateSquares(deltaTime);
		drawGrid();
		animationFrameId = requestAnimationFrame(animate);
	}

	updateCanvasSize();

	return {
		setOptions(next) {
			Object.assign(opts, next);
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
