/**
 * MagneticField engine — framework-free, byte-identical in the Svelte, React
 * and Vue trees.
 *
 * Every `MagneticItem` is a static outer node (measured, never transformed)
 * around an inner node that reads three CSS custom properties:
 * `--ft-mf-x` / `--ft-mf-y` (px) and `--ft-mf-r` (deg). This core owns those
 * properties. It keeps one magnet point per input channel, works out a
 * target offset and lean for each item from its distance to the magnet, and
 * steps three springs per item (x, y, rotation) toward it in a single
 * `requestAnimationFrame` loop shared by the whole field. The loop sleeps as
 * soon as every spring is at rest, so a still field schedules nothing.
 *
 * Each frame reads first (the root rect and any stale item rects), then
 * computes targets, then steps, then writes, so no frame forces a reflow per
 * item. Geometry is in field-local px measured from the root's PADDING box,
 * the same box an absolutely positioned child of the root lives in.
 *
 * Nothing here touches a browser global at import time; `ResizeObserver`,
 * `requestAnimationFrame` and `performance` are only reached inside functions.
 */

export interface MagneticPoint {
	x: number;
	y: number;
}

export interface MagneticSpring {
	stiffness: number;
	damping: number;
	mass: number;
}

export type MagneticSpringPreset = "soft" | "default" | "snappy";

/** Where the field's own magnet comes from (a `MagnetPuck` can drive it in either mode). */
export type MagneticFieldSource = "pointer" | "manual";

/** The input channels, in falling priority: puck, then manual, then pointer. */
export type MagneticSourceChannel = "pointer" | "manual" | "puck";

/**
 * Spring presets. `default` is near-critical (no visible overshoot, settles in
 * about a third of a second); `soft` overshoots a little; `snappy` is quicker.
 */
export const MAGNETIC_FIELD_SPRINGS: Readonly<
	Record<MagneticSpringPreset, Readonly<MagneticSpring>>
> = Object.freeze({
	soft: Object.freeze({ stiffness: 170, damping: 18, mass: 1 }),
	default: Object.freeze({ stiffness: 230, damping: 30, mass: 1 }),
	snappy: Object.freeze({ stiffness: 320, damping: 36, mass: 1 }),
});

export const MAGNETIC_FIELD_DEFAULTS = Object.freeze({
	radius: 220,
	strength: 1,
	maxTranslate: 24,
	maxRotate: 6,
	polarity: 1 as 1 | -1,
});

export interface MagneticItemOptions {
	/** Heavier items move and lean less and settle more slowly. Clamped to [0.25, 10]. */
	mass: number;
	/** Per-item pull multiplier. */
	strength: number;
	/** Whether the item moves toward the magnet. */
	pull: boolean;
	/** Whether the item leans toward the magnet. */
	rotate: boolean;
}

export interface MagneticFieldOptions {
	radius: number;
	strength: number;
	maxTranslate: number;
	maxRotate: number;
	spring: MagneticSpring;
	polarity: 1 | -1;
	reducedMotion: boolean;
	disabled: boolean;
	onActiveChange?: (active: boolean) => void;
}

/** Item rect in field-local px (relative to the root's PADDING box). */
export interface MagneticRect {
	left: number;
	top: number;
	width: number;
	height: number;
}

export interface MagneticTarget {
	/** Translation in px. */
	x: number;
	y: number;
	/** Lean in degrees, positive = clockwise. */
	r: number;
	/** Translation falloff, 0..1. */
	f: number;
}

const SUBSTEP = 1 / 240;
const MAX_DT = 1 / 30;
const FIRST_DT = 1 / 60;
const REST_POSITION = 0.01;
const MIN_ITEM_MASS = 0.25;
const MAX_ITEM_MASS = 10;
/** Below this centre distance (or `maxTranslate`, if larger) the pull fades linearly to 0. */
const MIN_CORE = 16;
/** Gain of the lean's horizontal-side curve. */
const LEAN_GAIN = 3;
/** The lean reaches twice as far as the pull. */
const LEAN_REACH = 2;
/**
 * Targets smaller than this (px for the pull, deg for the lean) cannot be
 * seen and snap to 0, so an item at the far edge of the lean's reach counts
 * as at rest instead of keeping the field engaged for a 0.02deg tilt.
 */
const MIN_VISIBLE = 0.05;

const DEFAULT_ITEM: Readonly<MagneticItemOptions> = Object.freeze({
	mass: 1,
	strength: 1,
	pull: true,
	rotate: true,
});

const ZERO: Readonly<MagneticTarget> = Object.freeze({ x: 0, y: 0, r: 0, f: 0 });

function clamp(v: number, lo: number, hi: number): number {
	return v < lo ? lo : v > hi ? hi : v;
}

function finite(v: number, fallback: number): number {
	return Number.isFinite(v) ? v : fallback;
}

function smoothstep(x: number): number {
	const t = clamp(x, 0, 1);
	return t * t * (3 - 2 * t);
}

function itemMass(mass: number): number {
	return clamp(finite(mass, 1), MIN_ITEM_MASS, MAX_ITEM_MASS);
}

/** A preset name or a partial config, completed from `default`. */
export function resolveSpring(
	spring?: MagneticSpringPreset | Partial<MagneticSpring>
): MagneticSpring {
	const base = MAGNETIC_FIELD_SPRINGS.default;
	if (spring === undefined || spring === null) return { ...base };
	if (typeof spring === "string") return { ...(MAGNETIC_FIELD_SPRINGS[spring] ?? base) };
	const stiffness = finite(spring.stiffness ?? base.stiffness, base.stiffness);
	const damping = finite(spring.damping ?? base.damping, base.damping);
	const mass = finite(spring.mass ?? base.mass, base.mass);
	return {
		stiffness: Math.max(1e-3, stiffness),
		damping: Math.max(0, damping),
		mass: Math.max(1e-3, mass),
	};
}

/**
 * The spring an item of `mass` actually runs: mass scales the inertia and
 * damping scales with its square root, so every item keeps the same damping
 * ratio and only its tempo changes. `rotation` doubles the stiffness (and
 * scales damping by √2) so the lean leads the pull, again at the same ratio.
 */
export function itemSpring(base: MagneticSpring, mass: number, rotation = false): MagneticSpring {
	const m = itemMass(mass);
	const k = rotation ? 2 : 1;
	return {
		stiffness: base.stiffness * k,
		damping: base.damping * Math.sqrt(m) * Math.sqrt(k),
		mass: base.mass * m,
	};
}

/** Distance from `p` to the nearest edge of `r`; 0 inside. */
export function rectDistance(p: MagneticPoint, r: MagneticRect): number {
	const dx = Math.max(r.left - p.x, 0, p.x - (r.left + r.width));
	const dy = Math.max(r.top - p.y, 0, p.y - (r.top + r.height));
	return Math.hypot(dx, dy);
}

/** `smoothstep(1 - d / radius)`: 1 at or inside the edge, 0 at `radius` and beyond. */
export function falloff(d: number, radius: number): number {
	return radius > 0 ? smoothstep(1 - d / radius) : 0;
}

/**
 * Where an item wants to be for a magnet at `p` (null: no magnet, rest).
 *
 * Pull: toward the magnet along the line from the item's centre, scaled by the
 * edge-distance falloff, the strengths and `1 / mass`, capped at
 * `maxTranslate`, and faded to 0 within `max(16, maxTranslate)` px of the
 * centre so the item never jumps past the magnet nor flips direction as the
 * magnet crosses its middle. `polarity` flips it.
 *
 * Lean: the item tilts toward the magnet's horizontal side, like a crowd
 * turning its head: clockwise when the magnet is to its left, counter-clockwise
 * to its right, whatever the height. It saturates quickly, so items lean
 * almost fully while barely moving, and its falloff reaches twice as far as the
 * pull's. `polarity` does not flip it.
 */
export function itemTarget(
	p: MagneticPoint | null,
	r: MagneticRect,
	field: Pick<
		MagneticFieldOptions,
		"radius" | "strength" | "maxTranslate" | "maxRotate" | "polarity"
	>,
	item: MagneticItemOptions
): MagneticTarget {
	if (!p) return { ...ZERO };
	const d = rectDistance(p, r);
	const f = falloff(d, field.radius);
	const fr = falloff(d, field.radius * LEAN_REACH);
	if (fr <= 0) return { ...ZERO };

	const m = itemMass(item.mass);
	const gain = Math.max(0, finite(field.strength, 0) * finite(item.strength, 0)) / m;
	const maxT = Math.max(0, finite(field.maxTranslate, 0));
	const maxR = Math.max(0, finite(field.maxRotate, 0));
	const cx = r.left + r.width / 2;
	const cy = r.top + r.height / 2;
	const dx = p.x - cx;
	const dy = p.y - cy;
	const len = Math.hypot(dx, dy);

	let x = 0;
	let y = 0;
	let rot = 0;
	if (item.pull && len > 0 && f > 0) {
		const core = Math.max(MIN_CORE, maxT);
		const k = Math.min(maxT, maxT * gain * f) * Math.min(1, len / core);
		const sign = field.polarity === -1 ? -1 : 1;
		x = (sign * k * dx) / len;
		y = (sign * k * dy) / len;
	}
	if (item.rotate && len > 0) {
		const scale = Math.max(len, r.width / 2);
		const side = Math.tanh((LEAN_GAIN * -dx) / scale);
		rot = clamp(maxR * gain * side * fr, -maxR, maxR);
	}
	if (Math.hypot(x, y) < MIN_VISIBLE) {
		x = 0;
		y = 0;
	}
	if (Math.abs(rot) < MIN_VISIBLE) rot = 0;
	// Normalise -0 so the written strings never read "-0.00".
	return { x: x || 0, y: y || 0, r: rot || 0, f };
}

/** One spring: position, velocity, target. */
export interface MagneticSpringState {
	x: number;
	v: number;
	target: number;
}

/**
 * Advances a spring by `dt` seconds (clamped to 1/30) in fixed 1/240 s
 * semi-implicit Euler substeps. Snaps to the target and returns false once
 * within `rest` with a speed under `rest * 10`; true while still moving.
 */
export function stepSpring(
	s: MagneticSpringState,
	cfg: MagneticSpring,
	dt: number,
	rest: number
): boolean {
	let left = Math.min(Math.max(dt, 0), MAX_DT);
	while (left > 1e-9) {
		const h = Math.min(SUBSTEP, left);
		const a = (-cfg.stiffness * (s.x - s.target) - cfg.damping * s.v) / cfg.mass;
		s.v += a * h;
		s.x += s.v * h;
		left -= h;
	}
	if (Math.abs(s.x - s.target) < rest && Math.abs(s.v) < rest * 10) {
		s.x = s.target;
		s.v = 0;
		return false;
	}
	return true;
}

export interface MagneticFieldCore {
	/** Sets a channel's magnet in field-local px (`null` clears it). Channel defaults to `"manual"`. */
	setSource(point: MagneticPoint | null, channel?: MagneticSourceChannel): void;
	/** Sets a channel's magnet in client px. Channel defaults to `"pointer"`. */
	setClientSource(clientX: number, clientY: number, channel?: MagneticSourceChannel): void;
	/** Clears one channel, or every channel when called without one. */
	clearSource(channel?: MagneticSourceChannel): void;
	/** Starts driving an item. Returns its unregister function. */
	register(outer: HTMLElement, inner: HTMLElement, opts?: Partial<MagneticItemOptions>): () => void;
	updateItem(outer: HTMLElement, opts: Partial<MagneticItemOptions>): void;
	update(opts: Partial<MagneticFieldOptions>): void;
	/** Marks every cached rect stale (after a scroll or resize). */
	invalidate(): void;
	/** Whether any item is pulled or still settling. */
	readonly active: boolean;
	/** Stops the loop and the observer and leaves every item at rest. */
	destroy(): void;
}

interface ChannelPoint {
	x: number;
	y: number;
	client: boolean;
}

interface Item {
	outer: HTMLElement;
	inner: HTMLElement;
	opts: MagneticItemOptions;
	rect: MagneticRect | null;
	rectDirty: boolean;
	sx: MagneticSpringState;
	sy: MagneticSpringState;
	sr: MagneticSpringState;
	cfg: MagneticSpring;
	cfgR: MagneticSpring;
	/** Last strings written, to skip unchanged style writes. */
	wx: string;
	wy: string;
	wr: string;
	/** Whether the inner node currently carries `will-change: transform`. */
	promoted: boolean;
}

const CHANNELS: readonly MagneticSourceChannel[] = ["puck", "manual", "pointer"];

function px(v: number): string {
	return `${(v || 0).toFixed(2)}px`;
}

function deg(v: number): string {
	return `${(v || 0).toFixed(2)}deg`;
}

function sameItemOptions(a: MagneticItemOptions, b: MagneticItemOptions): boolean {
	return (
		a.mass === b.mass && a.strength === b.strength && a.pull === b.pull && a.rotate === b.rotate
	);
}

function normaliseItem(opts?: Partial<MagneticItemOptions>): MagneticItemOptions {
	return {
		mass: opts?.mass ?? DEFAULT_ITEM.mass,
		strength: opts?.strength ?? DEFAULT_ITEM.strength,
		pull: opts?.pull ?? DEFAULT_ITEM.pull,
		rotate: opts?.rotate ?? DEFAULT_ITEM.rotate,
	};
}

export function createMagneticFieldCore(
	root: HTMLElement,
	initial?: Partial<MagneticFieldOptions>
): MagneticFieldCore {
	const options: MagneticFieldOptions = {
		radius: initial?.radius ?? MAGNETIC_FIELD_DEFAULTS.radius,
		strength: initial?.strength ?? MAGNETIC_FIELD_DEFAULTS.strength,
		maxTranslate: initial?.maxTranslate ?? MAGNETIC_FIELD_DEFAULTS.maxTranslate,
		maxRotate: initial?.maxRotate ?? MAGNETIC_FIELD_DEFAULTS.maxRotate,
		spring: resolveSpring(initial?.spring),
		polarity: initial?.polarity === -1 ? -1 : 1,
		reducedMotion: initial?.reducedMotion ?? false,
		disabled: initial?.disabled ?? false,
		onActiveChange: initial?.onActiveChange,
	};

	const items = new Map<HTMLElement, Item>();
	const channels: Record<MagneticSourceChannel, ChannelPoint | null> = {
		puck: null,
		manual: null,
		pointer: null,
	};

	let originX = 0;
	let originY = 0;
	let rootDirty = true;
	let targetsDirty = true;
	let frame = 0;
	let lastT = 0;
	let active = false;
	let destroyed = false;

	const observer =
		typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => invalidate());
	observer?.observe(root);

	function anyChannel(): boolean {
		return channels.puck !== null || channels.manual !== null || channels.pointer !== null;
	}

	/** The magnet in field-local px: the first channel holding a point. */
	function magnet(): MagneticPoint | null {
		if (options.disabled) return null;
		for (const name of CHANNELS) {
			const c = channels[name];
			if (c) return c.client ? { x: c.x - originX, y: c.y - originY } : { x: c.x, y: c.y };
		}
		return null;
	}

	function setActive(next: boolean): void {
		if (next === active) return;
		active = next;
		options.onActiveChange?.(next);
	}

	function write(item: Item): void {
		const x = px(item.sx.x);
		const y = px(item.sy.x);
		const r = deg(item.sr.x);
		const style = item.inner.style;
		if (x !== item.wx) style.setProperty("--ft-mf-x", (item.wx = x));
		if (y !== item.wy) style.setProperty("--ft-mf-y", (item.wy = y));
		if (r !== item.wr) style.setProperty("--ft-mf-r", (item.wr = r));
	}

	/**
	 * `will-change` follows the springs, not the targets: an item held still
	 * by a resting pointer or a sticky puck gives its compositor layer back
	 * once it has settled, and gets it again on the next move.
	 */
	function setPromoted(item: Item, promoted: boolean): void {
		if (promoted === item.promoted) return;
		item.promoted = promoted;
		item.inner.style.willChange = promoted ? "transform" : "";
	}

	function resetItem(item: Item): void {
		for (const s of [item.sx, item.sy, item.sr]) {
			s.x = 0;
			s.v = 0;
			s.target = 0;
		}
		write(item);
		setPromoted(item, false);
	}

	function snapAll(): void {
		cancel();
		for (const item of items.values()) resetItem(item);
		targetsDirty = true;
		setActive(false);
	}

	function cancel(): void {
		if (frame) cancelAnimationFrame(frame);
		frame = 0;
		lastT = 0;
	}

	function kick(): void {
		if (destroyed) return;
		if (options.reducedMotion) {
			snapAll();
			return;
		}
		if (!frame && typeof requestAnimationFrame === "function") {
			frame = requestAnimationFrame(step);
		}
	}

	function measure(): void {
		if (rootDirty) {
			const r = root.getBoundingClientRect();
			originX = r.left + (root.clientLeft || 0);
			originY = r.top + (root.clientTop || 0);
			rootDirty = false;
		}
		for (const item of items.values()) {
			if (!item.rectDirty) continue;
			const r = item.outer.getBoundingClientRect();
			item.rect = {
				left: r.left - originX,
				top: r.top - originY,
				width: r.width,
				height: r.height,
			};
			item.rectDirty = false;
		}
	}

	function retarget(): void {
		const p = magnet();
		for (const item of items.values()) {
			const t = item.rect && p ? itemTarget(p, item.rect, options, item.opts) : ZERO;
			item.sx.target = t.x;
			item.sy.target = t.y;
			item.sr.target = t.r;
		}
		targetsDirty = false;
	}

	function step(): void {
		frame = 0;
		if (destroyed) return;
		const t = performance.now();
		const dt = lastT ? Math.min(MAX_DT, (t - lastT) / 1000) : FIRST_DT;
		lastT = t;

		// Read phase: every layout read happens before any write below.
		measure();
		if (targetsDirty) retarget();

		let moving = false;
		let anyEngaged = false;
		for (const item of items.values()) {
			let itemMoving = false;
			if (stepSpring(item.sx, item.cfg, dt, REST_POSITION)) itemMoving = true;
			if (stepSpring(item.sy, item.cfg, dt, REST_POSITION)) itemMoving = true;
			if (stepSpring(item.sr, item.cfgR, dt, REST_POSITION)) itemMoving = true;
			write(item);
			setPromoted(item, itemMoving);
			const engaged =
				itemMoving || item.sx.target !== 0 || item.sy.target !== 0 || item.sr.target !== 0;
			if (itemMoving) moving = true;
			if (engaged) anyEngaged = true;
		}

		if (moving || targetsDirty) frame = requestAnimationFrame(step);
		else lastT = 0;
		setActive(anyEngaged);
	}

	function setChannel(channel: MagneticSourceChannel, next: ChannelPoint | null): void {
		if (destroyed) return;
		const prev = channels[channel];
		if (prev === next) return;
		if (prev && next && prev.x === next.x && prev.y === next.y && prev.client === next.client) {
			return;
		}
		channels[channel] = next;
		targetsDirty = true;
		// A magnet moving about far from every item of a field at rest changes
		// no target: store it and skip the wake. The next wake retargets.
		if (!active && !frame && outOfReach(prev) && outOfReach(next)) return;
		kick();
	}

	/**
	 * Whether a channel point is known to lie beyond the lean's reach of every
	 * item (or is empty). False whenever a rect it depends on is stale.
	 */
	function outOfReach(c: ChannelPoint | null): boolean {
		if (!c) return true;
		if (c.client && rootDirty) return false;
		const p = c.client ? { x: c.x - originX, y: c.y - originY } : { x: c.x, y: c.y };
		const reach = options.radius * LEAN_REACH;
		for (const item of items.values()) {
			if (item.rectDirty || !item.rect) return false;
			if (rectDistance(p, item.rect) < reach) return false;
		}
		return true;
	}

	function invalidate(): void {
		if (destroyed) return;
		rootDirty = true;
		for (const item of items.values()) item.rectDirty = true;
		targetsDirty = true;
		// Wake only when something can change: a magnet is set or an item is off rest.
		if (anyChannel() || active) kick();
	}

	function updateSprings(item: Item): void {
		item.cfg = itemSpring(options.spring, item.opts.mass);
		item.cfgR = itemSpring(options.spring, item.opts.mass, true);
	}

	return {
		setSource(point, channel = "manual") {
			setChannel(
				channel,
				point && Number.isFinite(point.x) && Number.isFinite(point.y)
					? { x: point.x, y: point.y, client: false }
					: null
			);
		},
		setClientSource(clientX, clientY, channel = "pointer") {
			if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return;
			setChannel(channel, { x: clientX, y: clientY, client: true });
		},
		clearSource(channel) {
			if (channel) {
				setChannel(channel, null);
				return;
			}
			for (const name of CHANNELS) setChannel(name, null);
		},
		register(outer, inner, opts) {
			if (destroyed) return () => {};
			const existing = items.get(outer);
			if (existing && existing.inner !== inner) resetItem(existing);
			const item: Item = {
				outer,
				inner,
				opts: normaliseItem(opts),
				rect: null,
				rectDirty: true,
				sx: existing && existing.inner === inner ? existing.sx : { x: 0, v: 0, target: 0 },
				sy: existing && existing.inner === inner ? existing.sy : { x: 0, v: 0, target: 0 },
				sr: existing && existing.inner === inner ? existing.sr : { x: 0, v: 0, target: 0 },
				cfg: options.spring,
				cfgR: options.spring,
				wx: "",
				wy: "",
				wr: "",
				promoted: false,
			};
			updateSprings(item);
			items.set(outer, item);
			write(item);
			observer?.observe(outer);
			targetsDirty = true;
			if (anyChannel() || active) kick();
			return () => {
				if (items.get(outer) !== item) return;
				items.delete(outer);
				observer?.unobserve(outer);
				resetItem(item);
				if (items.size === 0) setActive(false);
			};
		},
		updateItem(outer, opts) {
			const item = items.get(outer);
			if (!item || destroyed) return;
			const next = normaliseItem({ ...item.opts, ...opts });
			if (sameItemOptions(item.opts, next)) return;
			const massChanged = next.mass !== item.opts.mass;
			item.opts = next;
			if (massChanged) updateSprings(item);
			targetsDirty = true;
			if (anyChannel() || active) kick();
		},
		update(opts) {
			if (destroyed) return;
			const wasReduced = options.reducedMotion;
			let changed = false;
			if (opts.radius !== undefined && opts.radius !== options.radius) {
				options.radius = opts.radius;
				changed = true;
			}
			if (opts.strength !== undefined && opts.strength !== options.strength) {
				options.strength = opts.strength;
				changed = true;
			}
			if (opts.maxTranslate !== undefined && opts.maxTranslate !== options.maxTranslate) {
				options.maxTranslate = opts.maxTranslate;
				changed = true;
			}
			if (opts.maxRotate !== undefined && opts.maxRotate !== options.maxRotate) {
				options.maxRotate = opts.maxRotate;
				changed = true;
			}
			if (opts.polarity !== undefined) {
				const polarity = opts.polarity === -1 ? -1 : 1;
				if (polarity !== options.polarity) {
					options.polarity = polarity;
					changed = true;
				}
			}
			if (opts.disabled !== undefined && opts.disabled !== options.disabled) {
				options.disabled = opts.disabled;
				changed = true;
			}
			if (opts.reducedMotion !== undefined && opts.reducedMotion !== options.reducedMotion) {
				options.reducedMotion = opts.reducedMotion;
				changed = true;
			}
			if (opts.spring !== undefined) {
				const spring = resolveSpring(opts.spring);
				const s = options.spring;
				if (
					spring.stiffness !== s.stiffness ||
					spring.damping !== s.damping ||
					spring.mass !== s.mass
				) {
					// Position and velocity carry over: only the tempo changes.
					options.spring = spring;
					for (const item of items.values()) updateSprings(item);
					changed = true;
				}
			}
			if ("onActiveChange" in opts) options.onActiveChange = opts.onActiveChange;
			if (!changed) return;
			targetsDirty = true;
			if (options.reducedMotion) {
				if (!wasReduced || active) snapAll();
				return;
			}
			if (anyChannel() || active) kick();
		},
		invalidate,
		get active() {
			return active;
		},
		destroy() {
			if (destroyed) return;
			cancel();
			observer?.disconnect();
			for (const item of items.values()) resetItem(item);
			items.clear();
			for (const name of CHANNELS) channels[name] = null;
			active = false;
			destroyed = true;
		},
	};
}

/**
 * The context value a field hands its items and pucks: a registration buffer
 * that outlives the core. Items and pucks may mount before the field's core
 * exists (child effects run first in every framework) and may outlive it (a
 * strict-mode remount destroys and recreates the core); the hub replays every
 * registered item and the last point of each channel into whichever core is
 * attached.
 */
export interface MagneticFieldHub {
	register(outer: HTMLElement, inner: HTMLElement, opts?: Partial<MagneticItemOptions>): () => void;
	updateItem(outer: HTMLElement, opts: Partial<MagneticItemOptions>): void;
	setSource(point: MagneticPoint | null, channel: MagneticSourceChannel): void;
	/** Hands the buffer to `core`: replays every item and the last point of each channel. */
	attach(core: MagneticFieldCore): void;
	/** Forgets the core (about to be destroyed). The buffer is kept. */
	detach(): void;
}

interface HubEntry {
	inner: HTMLElement;
	opts: Partial<MagneticItemOptions>;
	unregister: (() => void) | null;
}

export function createMagneticFieldHub(): MagneticFieldHub {
	const entries = new Map<HTMLElement, HubEntry>();
	const sources: Record<MagneticSourceChannel, MagneticPoint | null> = {
		puck: null,
		manual: null,
		pointer: null,
	};
	let core: MagneticFieldCore | null = null;

	function detach(): void {
		for (const entry of entries.values()) {
			entry.unregister?.();
			entry.unregister = null;
		}
		core = null;
	}

	return {
		register(outer, inner, opts) {
			entries.get(outer)?.unregister?.();
			const entry: HubEntry = { inner, opts: { ...opts }, unregister: null };
			entries.set(outer, entry);
			if (core) entry.unregister = core.register(outer, inner, entry.opts);
			return () => {
				if (entries.get(outer) !== entry) return;
				entries.delete(outer);
				entry.unregister?.();
				entry.unregister = null;
			};
		},
		updateItem(outer, opts) {
			const entry = entries.get(outer);
			if (!entry) return;
			entry.opts = { ...entry.opts, ...opts };
			core?.updateItem(outer, opts);
		},
		setSource(point, channel) {
			sources[channel] = point ? { x: point.x, y: point.y } : null;
			core?.setSource(sources[channel], channel);
		},
		attach(next) {
			if (core) detach();
			core = next;
			for (const [outer, entry] of entries) {
				entry.unregister = next.register(outer, entry.inner, entry.opts);
			}
			for (const name of CHANNELS) {
				const p = sources[name];
				if (p) next.setSource(p, name);
			}
		},
		detach,
	};
}
