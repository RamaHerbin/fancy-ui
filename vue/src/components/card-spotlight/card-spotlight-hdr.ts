/**
 * CardSpotlight HDR light probe — framework-free, byte-identical in the
 * Svelte, React and Vue trees (see shared-cores.json).
 *
 * The CSS spotlight is a radial gradient at the pointer, capped at SDR white.
 * On an HDR display this adds a hot core at the same spot, in the same colour,
 * fading in and out over the same ~300 ms as the CSS layer.
 */

/**
 * The light and probe shapes of `_internals/hdr/hdr-light.ts`, restated here so
 * this file imports nothing outside its folder and stays byte-identical across
 * the Svelte, React and Vue trees.
 */
export interface Light {
	x0: number;
	y0: number;
	x1: number;
	y1: number;
	radius: number;
	halo: number;
	intensity: number;
	color?: string;
	white?: number;
}

export type LightProbe = (ctx: {
	width: number;
	height: number;
	now: number;
	peak: number;
}) => Light[];

export interface CardSpotlightHdrState {
	/** Pointer position relative to the card, CSS px. */
	x: number;
	y: number;
	hovering: boolean;
	/** `gradientSize`, `gradientColor`, `gradientOpacity`. */
	size: number;
	color: string;
	opacity: number;
}

const FADE_MS = 300;

export function createCardSpotlightProbe(read: () => CardSpotlightHdrState): LightProbe {
	let fade = 0;
	let last = 0;
	return ({ now }) => {
		const s = read();
		const dt = last ? Math.min(100, now - last) : 16;
		last = now;
		const target = s.hovering ? 1 : 0;
		const step = dt / FADE_MS;
		fade = target > fade ? Math.min(target, fade + step) : Math.max(target, fade - step);
		if (fade <= 0) return [];
		const light: Light = {
			x0: s.x,
			y0: s.y,
			x1: s.x,
			y1: s.y,
			// Wide and in the spotlight's own colour: the HDR light scales the
			// colour's energy, so a dim colour stays dim and a vivid one glows.
			radius: s.size * 0.3,
			halo: s.size * 0.25,
			intensity: 3 * s.opacity * fade,
			color: s.color,
			white: 0,
		};
		return [light];
	};
}
