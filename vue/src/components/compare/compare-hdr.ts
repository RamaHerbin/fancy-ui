/**
 * Compare HDR light probe — framework-free, byte-identical in the Svelte,
 * React and Vue trees (see shared-cores.json).
 *
 * The seam's CSS beam is capped at SDR white. On an HDR display this adds the
 * light above it: a hot core along the seam that climbs toward the peak as the
 * beam's energy rises (speed, interaction), its two chromatic fringes, and a
 * soft wash where the speed trail stretches.
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

export interface CompareHdrState {
	/** Seam position, 0–100. */
	percent: number;
	/** Beam energy 0 (idle) … 1 (lit). */
	energy: number;
	/** Speed trail, px, signed. */
	trail: number;
	/** Left fringe, centre, right fringe. */
	palette: [string, string, string];
}

export function createCompareProbe(read: () => CompareHdrState): LightProbe {
	return ({ width, height, peak }) => {
		const s = read();
		const x = (width * s.percent) / 100;
		const e = Math.min(1, Math.max(0, s.energy));
		const lights: Light[] = [
			{
				x0: x,
				y0: 0,
				x1: x,
				y1: height,
				radius: 1.2,
				halo: 5,
				intensity: 1.2 + (peak - 1.2) * e,
				color: s.palette[1],
				white: 0.8,
			},
			{
				x0: x - 2.5,
				y0: 0,
				x1: x - 2.5,
				y1: height,
				radius: 1.6,
				halo: 4,
				intensity: 0.5 + 1.1 * e,
				color: s.palette[0],
			},
			{
				x0: x + 2.5,
				y0: 0,
				x1: x + 2.5,
				y1: height,
				radius: 1.6,
				halo: 4,
				intensity: 0.5 + 1.1 * e,
				color: s.palette[2],
			},
		];
		if (Math.abs(s.trail) > 4) {
			const tx = x - s.trail * 0.5;
			lights.push({
				x0: tx,
				y0: 0,
				x1: tx,
				y1: height,
				radius: Math.abs(s.trail) * 0.25,
				halo: 10,
				intensity: 0.4 * e,
				color: s.palette[1],
			});
		}
		return lights;
	};
}
