// matrix-rain-core.ts — framework-free canvas 2D "digital rain" engine.
// No framework imports; no module-scope window/document/navigator access;
// no build-time env access; Math.random only via the injectable `random` param.

const GLYPHS =
	"アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&";

export interface MatrixRainElements {
	canvas: HTMLCanvasElement;
}

// Nothing in this component is snapshotted at mount: every option is re-read by
// the engine after creation, so there are no mount-only options.
export interface MatrixRainInitOptions {}

export interface MatrixRainLiveOptions {
	/** Glyph colour. Read by `draw()` every frame — changing it never relayouts. */
	color?: string;
	/** Rows advanced per frame (and, below 1, the advance cadence). Per-frame. */
	speed?: number;
	/**
	 * Column density. Changing it re-lays-out the columns (full black repaint +
	 * re-randomised column heads), exactly as the Svelte wrapper's mount effect
	 * did when it re-ran on this prop before the extraction.
	 */
	density?: number;
	/** Glyph size in px. Relayout-triggering, like `density`. */
	glyphSize?: number;
	/** Alpha of the per-frame fade-trail rectangle. Per-frame. */
	fadeOpacity?: number;
}

export interface MatrixRainEngine {
	setOptions(next: Partial<MatrixRainLiveOptions>): void;
	resize(): void;
	destroy(): void;
}

const DEFAULTS: Required<MatrixRainLiveOptions> = {
	color: "#00ff41",
	speed: 1.0,
	density: 1.0,
	glyphSize: 16,
	fadeOpacity: 0.05,
};

// Explicit key-by-key merge: an `undefined` value must fall back to the current
// value (the way a Svelte prop default absorbs `undefined`), never punch a hole
// in the Required<> record the way object spread would.
function merge(
	base: Required<MatrixRainLiveOptions>,
	next: Partial<MatrixRainLiveOptions>
): Required<MatrixRainLiveOptions> {
	return {
		color: next.color ?? base.color,
		speed: next.speed ?? base.speed,
		density: next.density ?? base.density,
		glyphSize: next.glyphSize ?? base.glyphSize,
		fadeOpacity: next.fadeOpacity ?? base.fadeOpacity,
	};
}

export function createMatrixRain(
	elements: MatrixRainElements,
	options: MatrixRainInitOptions & MatrixRainLiveOptions,
	random: () => number = Math.random
): MatrixRainEngine | null {
	const { canvas } = elements;
	const maybeCtx = canvas.getContext("2d");
	if (!maybeCtx) return null;
	// Re-bound with a non-nullable type so the nested draw/resize closures need
	// no non-null assertions (TS does not carry the narrowing into them).
	const ctx: CanvasRenderingContext2D = maybeCtx;

	let opts: Required<MatrixRainLiveOptions> = merge(DEFAULTS, options);

	let rafId: number | null = null;
	let columns: number[] = [];
	// Frame counter drives the sub-1x-speed advance cadence. It lives for the
	// whole engine lifetime and is deliberately NOT reset by a relayout — in the
	// pre-extraction wrapper it was component-scope state that survived the
	// mount effect re-running on glyphSize/density.
	let frameCount = 0;
	let canvasW = 0;
	let canvasH = 0;
	let destroyed = false;

	function randomGlyph(): string {
		// random() ∈ [0, 1) ⇒ the index is always in range.
		return GLYPHS[Math.floor(random() * GLYPHS.length)]!;
	}

	function initColumns(w: number, h: number) {
		const safeGlyphSize = Math.max(1, opts.glyphSize);
		const safeDensity = Math.max(0.1, opts.density);
		const colCount = Math.max(1, Math.floor(w / (safeGlyphSize * safeDensity)));
		columns = Array.from({ length: colCount }, () => Math.floor(random() * (h / safeGlyphSize)));
	}

	function resize() {
		if (destroyed) return;
		const dpr = window.devicePixelRatio || 1;
		canvasW = canvas.clientWidth;
		canvasH = canvas.clientHeight;
		canvas.width = Math.floor(canvasW * dpr);
		canvas.height = Math.floor(canvasH * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.fillStyle = "black";
		ctx.fillRect(0, 0, canvasW, canvasH);
		initColumns(canvasW, canvasH);
	}

	function draw() {
		if (destroyed) return;

		const w = canvasW;
		const h = canvasH;

		// Fade trail
		ctx.fillStyle = `rgba(0, 0, 0, ${opts.fadeOpacity})`;
		ctx.fillRect(0, 0, w, h);

		ctx.font = `${opts.glyphSize}px monospace`;
		ctx.shadowBlur = 8;
		ctx.shadowColor = opts.color;

		const rowsPerFrame = Math.max(1, opts.speed);
		frameCount++;

		// Only advance every N frames to control speed below 1x
		const shouldAdvance = opts.speed >= 1 || frameCount % Math.round(1 / opts.speed) === 0;

		if (shouldAdvance) {
			for (let i = 0; i < columns.length; i++) {
				// i < columns.length ⇒ the element exists.
				const column = columns[i]!;
				const x = i * opts.glyphSize * opts.density;
				const y = column * opts.glyphSize;

				// Head character (bright white)
				ctx.fillStyle = "#ffffff";
				ctx.fillText(randomGlyph(), x, y);

				// Body glyph one step behind (dimmer)
				if (column > 1) {
					ctx.fillStyle = opts.color;
					ctx.fillText(randomGlyph(), x, y - opts.glyphSize);
				}

				// Reset column when it exits bottom, with random delay
				if (y > h && random() > 0.975) {
					columns[i] = 0;
				} else {
					columns[i] = column + rowsPerFrame;
				}
			}
		}

		ctx.shadowBlur = 0;
		rafId = requestAnimationFrame(draw);
	}

	resize();
	rafId = requestAnimationFrame(draw);

	return {
		setOptions(next) {
			if (destroyed) return;
			const prev = opts;
			opts = merge(opts, next);
			// Layout-affecting options relayout the column grid, reproducing the
			// pre-extraction wrapper whose mount effect re-ran (repaint + column
			// re-randomisation) when — and only when — glyphSize or density changed.
			if (opts.glyphSize !== prev.glyphSize || opts.density !== prev.density) {
				resize();
			}
		},
		resize,
		destroy() {
			if (destroyed) return;
			destroyed = true;
			if (rafId !== null) {
				cancelAnimationFrame(rafId);
				rafId = null;
			}
		},
	};
}
