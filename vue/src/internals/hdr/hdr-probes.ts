/**
 * HDR light probes for CSS-animated glows — framework-free, byte-identical in
 * the Svelte, React and Vue trees (see shared-cores.json).
 *
 * These components animate their light purely in CSS (registered `@property`
 * angles, `offset-path` riders, transforms, `stroke-dashoffset`), so JS has no
 * state to read. The probes read the browser's LIVE computed values instead —
 * the animated angle, the rider's box, the dash offset — every frame. The CSS
 * timeline stays the single source of truth, and the HDR light can never drift
 * from it.
 */

import type { HdrLightSpec, HdrProbe } from "./hdr-light.js";

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/**
 * Where a ray from the centre of a `width × height` box, at a conic-gradient
 * angle (0 = up, clockwise, degrees), meets its border inset by `inset` px with
 * corner radius `radius`.
 */
export function conicBorderPoint(
	width: number,
	height: number,
	angleDeg: number,
	radius = 0,
	inset = 0
): { x: number; y: number } {
	const a = (angleDeg * Math.PI) / 180;
	const dx = Math.sin(a);
	const dy = -Math.cos(a);
	const hw = Math.max(0, width / 2 - inset);
	const hh = Math.max(0, height / 2 - inset);
	const t = Math.min(
		Math.abs(dx) > 1e-9 ? hw / Math.abs(dx) : Infinity,
		Math.abs(dy) > 1e-9 ? hh / Math.abs(dy) : Infinity
	);
	let x = dx * t;
	let y = dy * t;
	// Pull points that land in a rounded corner's square onto its arc.
	const r = Math.max(0, Math.min(radius - inset, hw, hh));
	if (r > 0) {
		const cx = Math.sign(x) * (hw - r);
		const cy = Math.sign(y) * (hh - r);
		if (Math.abs(x) > hw - r && Math.abs(y) > hh - r) {
			const vx = x - cx;
			const vy = y - cy;
			const len = Math.hypot(vx, vy) || 1;
			x = cx + (vx / len) * r;
			y = cy + (vy / len) * r;
		}
	}
	return { x: width / 2 + x, y: height / 2 + y };
}

function readAngle(el: Element, prop: string): number | null {
	const v = parseFloat(getComputedStyle(el).getPropertyValue(prop));
	return Number.isFinite(v) ? v : null;
}

// ---------------------------------------------------------------------------
// Conic borders (GradientButton, NeonBorder, GlowBorder)
// ---------------------------------------------------------------------------

/** One lit arc of a conic gradient, in percent of the turn from its `from` angle. */
export interface ConicArc {
	from: number;
	to: number;
	/** Colour at a position 0..1 along the arc. */
	color: (t: number) => string;
	/** Intensity at a position 0..1 along the arc (1 = SDR white level). */
	intensity: (t: number) => number;
	/** Mix toward white at the core, 0..1. */
	white?: number;
}

export interface ConicBorderOptions {
	/** Element whose computed style carries the animated angle. */
	angleFrom: Element;
	/** The registered custom property animated by CSS, e.g. `--gb-angle`. */
	angleVar: string;
	arcs: () => ConicArc[];
	/** Corner radius and border inset of the lit ring, CSS px. */
	radius: () => number;
	inset?: () => number;
	/** Live overall level 0..1 (fades, ignite). Default 1. */
	level?: () => number;
	/** Light thickness. Default 1.4 px core, 6 px halo. */
	radiusPx?: number;
	halo?: number;
}

const ARC_STEP = 1.5;

export function conicBorderProbe(o: ConicBorderOptions): HdrProbe {
	return ({ width, height }) => {
		const level = o.level ? o.level() : 1;
		if (level <= 0.01) return [];
		const angle = readAngle(o.angleFrom, o.angleVar);
		if (angle === null) return [];
		const r = o.radius();
		const inset = o.inset ? o.inset() : 0;
		const lights: HdrLightSpec[] = [];
		for (const arc of o.arcs()) {
			const span = arc.to - arc.from;
			const steps = Math.max(1, Math.ceil(span / ARC_STEP));
			let prev = conicBorderPoint(width, height, angle + arc.from * 3.6, r, inset);
			for (let i = 1; i <= steps; i++) {
				const t = i / steps;
				const p = conicBorderPoint(width, height, angle + (arc.from + span * t) * 3.6, r, inset);
				const intensity = arc.intensity(t - 0.5 / steps) * level;
				if (intensity > 0.02) {
					lights.push({
						x0: prev.x,
						y0: prev.y,
						x1: p.x,
						y1: p.y,
						radius: o.radiusPx ?? 1.4,
						halo: o.halo ?? 6,
						intensity,
						color: arc.color(t),
						white: arc.white ?? 0.3,
					});
				}
				prev = p;
			}
		}
		return lights;
	};
}

// ---------------------------------------------------------------------------
// Riders (BorderBeam): an element moved by offset-path / transform
// ---------------------------------------------------------------------------

export interface RiderOptions {
	host: Element;
	/** The element whose box centre is the light's head. */
	rider: Element;
	color: () => string;
	/** Peak intensity of the head; the short trail falls off behind it. */
	intensity: () => number;
	/** Trail length in frames of history. Default 8. */
	trail?: number;
}

export function riderProbe(o: RiderOptions): HdrProbe {
	const history: { x: number; y: number }[] = [];
	return () => {
		const hb = o.host.getBoundingClientRect();
		const rb = o.rider.getBoundingClientRect();
		const opacity = parseFloat(getComputedStyle(o.rider).opacity);
		if (rb.width === 0 && rb.height === 0) return [];
		const head = { x: rb.left + rb.width / 2 - hb.left, y: rb.top + rb.height / 2 - hb.top };
		const last = history[0];
		// A jump (wrap-around, resize) breaks the trail instead of drawing a chord.
		if (last && Math.hypot(head.x - last.x, head.y - last.y) > 80) history.length = 0;
		history.unshift(head);
		history.length = Math.min(history.length, o.trail ?? 8);
		const level = (Number.isFinite(opacity) ? opacity : 1) * o.intensity();
		if (level <= 0.02) return [];
		const color = o.color();
		const lights: HdrLightSpec[] = [
			{
				x0: head.x,
				y0: head.y,
				x1: head.x,
				y1: head.y,
				radius: 2,
				halo: 8,
				intensity: level,
				color,
				white: 0.7,
			},
		];
		for (let i = 1; i < history.length; i++) {
			const a = history[i - 1]!;
			const b = history[i]!;
			lights.push({
				x0: a.x,
				y0: a.y,
				x1: b.x,
				y1: b.y,
				radius: 1.3,
				halo: 5,
				intensity: level * 0.45 * (1 - i / history.length),
				color,
				white: 0.3,
			});
		}
		return lights;
	};
}

// ---------------------------------------------------------------------------
// Meteors: rotated heads moved by a transform
// ---------------------------------------------------------------------------

export interface MeteorsOptions {
	host: Element;
	meteors: () => Iterable<HTMLElement>;
	/** Peak intensity of a head at full opacity. */
	intensity: number;
}

export function meteorsProbe(o: MeteorsOptions): HdrProbe {
	return () => {
		const hb = o.host.getBoundingClientRect();
		const lights: HdrLightSpec[] = [];
		for (const m of o.meteors()) {
			const cs = getComputedStyle(m);
			const opacity = parseFloat(cs.opacity);
			if (!(opacity > 0.02)) continue;
			const rb = m.getBoundingClientRect();
			if (rb.right < hb.left || rb.left > hb.right || rb.bottom < hb.top || rb.top > hb.bottom) {
				continue;
			}
			const x = rb.left + rb.width / 2 - hb.left;
			const y = rb.top + rb.height / 2 - hb.top;
			const scale = parseFloat(cs.getPropertyValue("--meteor-scale")) || 1;
			// Only the head burns above white; the CSS tail carries the streak.
			const color = cs.backgroundColor;
			lights.push({
				x0: x,
				y0: y,
				x1: x,
				y1: y,
				radius: 1.6 * scale,
				halo: 6 * scale,
				intensity: o.intensity * opacity,
				color,
				white: 0.6,
			});
		}
		return lights;
	};
}

// ---------------------------------------------------------------------------
// SVG dash packets (AnimatedBeam)
// ---------------------------------------------------------------------------

export interface PacketOptions {
	host: Element;
	/** The dash-animated paths whose leading edge is the packet's head. */
	paths: () => Iterable<SVGPathElement>;
	color: () => string;
	intensity: number;
	/** Optional arrival blooms: circles whose live opacity lights their centre. */
	blooms?: () => Iterable<SVGCircleElement>;
	bloomColor?: () => string;
}

export function packetProbe(o: PacketOptions): HdrProbe {
	return () => {
		const hb = o.host.getBoundingClientRect();
		const lights: HdrLightSpec[] = [];
		for (const path of o.paths()) {
			const cs = getComputedStyle(path);
			const offset = parseFloat(cs.strokeDashoffset);
			const dash = parseFloat(cs.strokeDasharray);
			if (!Number.isFinite(offset) || !Number.isFinite(dash)) continue;
			let total = 0;
			try {
				total = path.getTotalLength();
			} catch {
				continue;
			}
			// Dash units follow `pathLength` when the path declares one.
			const declared = parseFloat(path.getAttribute("pathLength") ?? "");
			const unit = Number.isFinite(declared) && declared > 0 ? total / declared : 1;
			// The dash covers [-offset, -offset + dash] along the path: its far end leads.
			const head = (-offset + dash) * unit;
			if (head <= 0 || -offset * unit >= total) continue;
			const s = Math.min(total, head);
			const ctm = path.getScreenCTM();
			if (!ctm) continue;
			const p = path.getPointAtLength(s);
			const q = path.getPointAtLength(Math.max(0, s - 10));
			const P = new DOMPoint(p.x, p.y).matrixTransform(ctm);
			const Q = new DOMPoint(q.x, q.y).matrixTransform(ctm);
			lights.push({
				x0: Q.x - hb.left,
				y0: Q.y - hb.top,
				x1: P.x - hb.left,
				y1: P.y - hb.top,
				radius: 1.8,
				halo: 7,
				intensity: o.intensity,
				color: o.color(),
				white: 0.75,
			});
		}
		if (o.blooms) {
			for (const c of o.blooms()) {
				const opacity = parseFloat(getComputedStyle(c).opacity);
				if (!(opacity > 0.02)) continue;
				const ctm = c.getScreenCTM();
				if (!ctm) continue;
				const P = new DOMPoint(c.cx.baseVal.value, c.cy.baseVal.value).matrixTransform(ctm);
				lights.push({
					x0: P.x - hb.left,
					y0: P.y - hb.top,
					x1: P.x - hb.left,
					y1: P.y - hb.top,
					radius: 4,
					halo: 10,
					intensity: o.intensity * 0.7 * opacity,
					color: o.bloomColor ? o.bloomColor() : o.color(),
					white: 0.5,
				});
			}
		}
		return lights;
	};
}
