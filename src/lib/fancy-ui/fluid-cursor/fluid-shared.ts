// Pure helpers shared by the WebGL and WebGPU fluid engines.

export interface ColorRGB {
	r: number;
	g: number;
	b: number;
}

export interface Pointer {
	id: number;
	texcoordX: number;
	texcoordY: number;
	prevTexcoordX: number;
	prevTexcoordY: number;
	deltaX: number;
	deltaY: number;
	down: boolean;
	moved: boolean;
	color: ColorRGB;
}

export function pointerPrototype(): Pointer {
	return {
		id: -1,
		texcoordX: 0,
		texcoordY: 0,
		prevTexcoordX: 0,
		prevTexcoordY: 0,
		deltaX: 0,
		deltaY: 0,
		down: false,
		moved: false,
		color: { r: 0, g: 0, b: 0 },
	};
}

export function hexToRgb(hex: string): ColorRGB {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	if (!result) {
		console.warn(
			`[FluidCursor] Invalid hex color: "${hex}". Expected format: "#rrggbb". Falling back to white.`
		);
		return { r: 1, g: 1, b: 1 };
	}
	return {
		r: parseInt(result[1], 16) / 255,
		g: parseInt(result[2], 16) / 255,
		b: parseInt(result[3], 16) / 255,
	};
}

export function HSVtoRGB(h: number, s: number, v: number): ColorRGB {
	let r = 0;
	let g = 0;
	let b = 0;
	const i = Math.floor(h * 6);
	const f = h * 6 - i;
	const p = v * (1 - s);
	const q = v * (1 - f * s);
	const t = v * (1 - (1 - f) * s);

	switch (i % 6) {
		case 0:
			r = v;
			g = t;
			b = p;
			break;
		case 1:
			r = q;
			g = v;
			b = p;
			break;
		case 2:
			r = p;
			g = v;
			b = t;
			break;
		case 3:
			r = p;
			g = q;
			b = v;
			break;
		case 4:
			r = t;
			g = p;
			b = v;
			break;
		case 5:
			r = v;
			g = p;
			b = q;
			break;
	}
	return { r, g, b };
}

export function wrap(value: number, min: number, max: number) {
	const range = max - min;
	if (range === 0) return min;
	return ((value - min) % range) + min;
}

/** Sim/dye grid size for a given base resolution and drawing buffer dimensions. */
export function getSimResolution(resolution: number, bufferWidth: number, bufferHeight: number) {
	const aspectRatio = bufferWidth / bufferHeight;
	const aspect = aspectRatio < 1 ? 1 / aspectRatio : aspectRatio;
	const min = Math.round(resolution);
	const max = Math.round(resolution * aspect);
	if (bufferWidth > bufferHeight) {
		return { width: max, height: min };
	}
	return { width: min, height: max };
}

export function correctRadius(radius: number, width: number, height: number) {
	const aspectRatio = width / height;
	if (aspectRatio > 1) return radius * aspectRatio;
	return radius;
}

/**
 * In contained mode the splat radius is a fraction of the canvas, so the same
 * settings that look right fullscreen produce a tiny effect inside a small
 * demo container. Grow the radius with the viewport/container ratio —
 * sub-linearly in apparent size (the gaussian's characteristic length is
 * sqrt(radius), so `radius * k` scales the length by sqrt(k)): a small demo
 * reads bigger without mimicking fullscreen 1:1. Must be applied to the
 * final, aspect-corrected radius; the 0.09 cap keeps the characteristic
 * length under ~30% of the container height.
 */
export function scaleRadiusForContainer(
	radius: number,
	containerHeight: number,
	viewportHeight: number
): number {
	if (containerHeight <= 0 || viewportHeight <= 0) return radius;
	const k = viewportHeight / containerHeight;
	if (k <= 1) return radius;
	// The cap only limits the auto-scaling — a caller-provided radius that is
	// already larger must never be shrunk by entering a small container.
	return Math.max(radius, Math.min(radius * k, 0.09));
}

export function correctDeltaX(delta: number, width: number, height: number) {
	const aspectRatio = width / height;
	if (aspectRatio < 1) return delta * aspectRatio;
	return delta;
}

export function correctDeltaY(delta: number, width: number, height: number) {
	const aspectRatio = width / height;
	if (aspectRatio > 1) return delta / aspectRatio;
	return delta;
}

/**
 * How the fluid is actually being rendered, surfaced as data so callers can
 * react (e.g. tell true HDR output apart from a clamped fallback):
 * - "webgpu-hdr": WebGPU with extended tone mapping active AND a display
 *   reporting `(dynamic-range: high)` — true HDR output.
 * - "webgpu-sdr": WebGPU float16 + P3, but the browser clamped tone mapping or
 *   the output display is SDR.
 * - "webgl-p3":   WebGL fallback with a display-p3 drawing buffer.
 * - "webgl-sdr":  WebGL fallback, plain sRGB.
 * - "none":       no GPU rendering available at all; the handle is inert.
 *
 * Sampled once when the handle is created: it does not update if the window
 * later moves to a display with a different dynamic range.
 */
export type FluidRenderLevel = "webgpu-hdr" | "webgpu-sdr" | "webgl-p3" | "webgl-sdr" | "none";

/**
 * Imperative control surface handed to `FluidCursor`'s `onReady` callback so a
 * parent can drive the simulation programmatically (trace a path, fire a
 * one-off burst) and read back which render path actually engaged. Coordinates
 * are in [0,1] with the ORIGIN AT THE TOP-LEFT (CSS convention); velocity is
 * derived from consecutive `moveTo` calls, so smooth paths feel like a real
 * cursor. Any engine-specific Y flip is internal.
 */
export interface FluidCursorHandle {
	/** Drive the synthetic pointer like a mouse. The next `moveTo` after `penUp` repositions without drawing. */
	moveTo(x: number, y: number, color?: ColorRGB): void;
	/** Lift the pen so the next `moveTo` repositions without producing a connecting streak. */
	penUp(): void;
	/** One-off impulse (click-like burst). Same coord convention; dx/dy in engine velocity units. */
	burst(x: number, y: number, dx: number, dy: number, color: ColorRGB): void;
	readonly renderLevel: FluidRenderLevel;
}
