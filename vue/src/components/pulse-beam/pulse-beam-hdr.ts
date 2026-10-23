/**
 * PulseBeam HDR light probe — framework-free, byte-identical in the Svelte,
 * React and Vue trees (see shared-cores.json).
 *
 * The beam is CSS: soft gradient blobs seen through a 1 px ring, capped at SDR
 * white. On an HDR display this adds the light above white where each blob
 * crosses the ring. Positions and shapes come from the same custom properties
 * the shared loop writes on the host (`--pb-bx1`, `--pb-bw2`, `--pb-op-tl`…),
 * and the stroke layer's live opacity carries the fade in and out, so the HDR
 * light moves and breathes exactly with the CSS beam.
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
	hue?: number;
	brightness?: number;
	saturation?: number;
	white?: number;
}

export type LightProbe = (ctx: {
	width: number;
	height: number;
	now: number;
	peak: number;
}) => Light[];
import type { StrokeLight } from "./pulse-beam-data.js";

export interface PulseBeamHdrState {
	blobs: StrokeLight[];
}

function num(style: CSSStyleDeclaration, prop: string, fallback: number): number {
	const v = parseFloat(style.getPropertyValue(prop));
	return Number.isFinite(v) ? v : fallback;
}

export function createPulseBeamProbe(
	host: HTMLElement,
	stroke: HTMLElement,
	read: () => PulseBeamHdrState
): LightProbe {
	return ({ width, height, peak }) => {
		const { blobs } = read();
		// Already includes `strength`, the preset and the fade transition.
		const opacity = parseFloat(getComputedStyle(stroke).opacity);
		const level = Number.isFinite(opacity) ? opacity : 0;
		if (level <= 0.01) return [];
		const style = host.style;
		const gh = num(style, "--pb-gh", 1);
		// The outside variant scales its blobs with the box (set by the host's
		// resize observer); every other variant leaves these unset.
		const sx = num(style, "--pb-sx", 1);
		const sy = num(style, "--pb-sy", 1);
		// The layers are drawn through `hue-rotate() brightness() saturate()`;
		// the light goes through the same filter or the two colours drift apart.
		const hue = num(style, "--pb-hue", 0);
		const brightness = num(style, "--pb-brightness", 1);
		const saturation = num(style, "--pb-saturation", 1);
		const lights: Light[] = [];
		for (const b of blobs) {
			const cx = b.fx * width + num(style, `--pb-bx${b.region}`, 0);
			const cy = b.fy * height + num(style, `--pb-by${b.region}`, 0);
			const w = b.w * num(style, `--pb-bw${b.region}`, 1) * sx;
			const h = b.h * num(style, `--pb-bh${b.region}`, 1) * gh * sy;
			const alpha = num(style, `--pb-op-${b.quad}`, 1);
			// Snap the blob to the ring edge it sits on and light the stretch of
			// that edge it covers.
			const dTop = Math.abs(cy);
			const dBottom = Math.abs(height - cy);
			const dLeft = Math.abs(cx);
			const dRight = Math.abs(width - cx);
			const nearest = Math.min(dTop, dBottom, dLeft, dRight);
			let x0: number, y0: number, x1: number, y1: number;
			if (nearest === dTop || nearest === dBottom) {
				const y = nearest === dTop ? 0 : height;
				x0 = Math.max(0, cx - w * 0.3);
				x1 = Math.min(width, cx + w * 0.3);
				y0 = y1 = y;
			} else {
				const x = nearest === dLeft ? 0 : width;
				y0 = Math.max(0, cy - h * 0.3);
				y1 = Math.min(height, cy + h * 0.3);
				x0 = x1 = x;
			}
			if (x1 < x0 || y1 < y0) continue;
			lights.push({
				x0,
				y0,
				x1,
				y1,
				radius: 1.4,
				halo: 6,
				intensity: (peak - 1.5) * alpha * level,
				color: b.color,
				hue,
				brightness,
				saturation,
				white: 0.45,
			});
		}
		return lights;
	};
}
