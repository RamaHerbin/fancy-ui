/**
 * ShimmerButton HDR light probe — framework-free, byte-identical in the
 * Svelte, React and Vue trees (see shared-cores.json).
 *
 * The satin sweep and the hover spot are CSS, capped at SDR white. On an HDR
 * display this adds a glint above white that follows them exactly: the sweep's
 * position is read from the band's live, animated `background-position` (the
 * CSS timeline stays the single source of truth), the spot from `--mx`/`--my`.
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

export interface ShimmerHdrState {
	color: string;
}

/** The sweep's band sits at 50% of a 250%-wide gradient image. */
const IMAGE_SCALE = 2.5;
/** The gradient runs at 108deg, so the band leans 18deg off vertical. */
const LEAN = Math.tan((18 * Math.PI) / 180);

/** Band centre (CSS px from the left) for a `background-position` x of `p` (0..1). */
export function sweepX(width: number, p: number): number {
	const image = width * IMAGE_SCALE;
	return (width - image) * p + image / 2;
}

export function createShimmerProbe(
	button: HTMLElement,
	sheen: HTMLElement,
	read: () => ShimmerHdrState
): LightProbe {
	let spotFade = 0;
	let last = 0;
	return ({ width, height, now }) => {
		const { color } = read();
		const dt = last ? Math.min(100, now - last) : 16;
		last = now;
		if (button.matches(":disabled")) return [];
		const hovering = button.matches(":hover");
		spotFade = Math.max(0, Math.min(1, spotFade + (hovering ? 1 : -1) * (dt / 300)));
		const lights: Light[] = [];

		const sweepVisible = 1 - spotFade;
		if (sweepVisible > 0.01) {
			const pos = getComputedStyle(sheen).backgroundPositionX || "100%";
			const p = parseFloat(pos) / 100;
			const x = sweepX(width, Number.isFinite(p) ? p : 1);
			const dx = (height / 2) * LEAN;
			if (x > -dx && x < width + dx) {
				lights.push({
					x0: x + dx,
					y0: 0,
					x1: x - dx,
					y1: height,
					radius: 1.1,
					halo: 3.5,
					intensity: 1.7 * sweepVisible,
					color,
					white: 0.6,
				});
			}
		}

		if (spotFade > 0.01) {
			const style = button.style;
			const mx = parseFloat(style.getPropertyValue("--mx"));
			const my = parseFloat(style.getPropertyValue("--my"));
			if (Number.isFinite(mx) && Number.isFinite(my)) {
				lights.push({
					x0: mx,
					y0: my,
					x1: mx,
					y1: my,
					radius: 12,
					halo: 14,
					intensity: 1.4 * spotFade,
					color,
					white: 0.3,
				});
			}
		}
		return lights;
	};
}
