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
 * demo container. Scale the radius so the apparent splat size matches what it
 * would be at viewport size, capped so a single splat cannot swallow a very
 * small container (the gaussian's characteristic length is sqrt(radius), so
 * the cap of 0.09 keeps it under ~30% of the container height).
 */
export function scaleRadiusForContainer(
	radius: number,
	containerHeight: number,
	viewportHeight: number
): number {
	if (containerHeight <= 0 || viewportHeight <= 0) return radius;
	const k = viewportHeight / containerHeight;
	if (k <= 1) return radius;
	return Math.min(radius * k * k, 0.09);
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
