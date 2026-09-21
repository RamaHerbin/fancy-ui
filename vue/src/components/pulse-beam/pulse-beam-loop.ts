/**
 * PulseBeam — one shared requestAnimationFrame loop for every mounted instance.
 *
 * Each instance registers its host element plus its oscillator set; the loop
 * writes the animated custom properties straight onto `el.style` (no Svelte
 * reactivity in the hot path). One loop for N instances keeps them in phase and
 * keeps the frame budget to a single callback.
 *
 * Throttled to ~30 fps: the blobs are soft and slow, 60 fps is invisible here
 * and doubles the style-recalc cost. Paused entries are skipped; when every
 * entry is paused the loop stops rescheduling and restarts on the next
 * `setPaused(false)`.
 *
 * Nothing here touches `window` at module evaluation time — safe under SSR.
 */
import { oscillate, type Oscillator } from "./pulse-beam-data.js";

interface Entry {
	el: HTMLElement;
	oscillators: Oscillator[];
	hue: { period: number } | null;
	paused: boolean;
}

export interface PulseHandle {
	setPaused(paused: boolean): void;
	unregister(): void;
}

const MIN_DT = 1000 / 30 - 2;

const entries = new Set<Entry>();
let rafId: number | null = null;
let last = -Infinity;

function write(e: Entry, t: number) {
	const s = e.el.style;
	for (const o of e.oscillators) {
		const v = oscillate(o, t);
		s.setProperty(o.prop, o.unit === "px" ? `${v.toFixed(2)}px` : v.toFixed(4));
	}
	if (e.hue) {
		const deg = ((t / e.hue.period) % 1) * 360;
		s.setProperty("--pb-hue", `${deg.toFixed(2)}deg`);
	}
}

function tick(now: number) {
	let live = 0;
	for (const e of entries) if (!e.paused) live++;
	if (live === 0) {
		rafId = null;
		return;
	}
	rafId = requestAnimationFrame(tick);
	if (now - last < MIN_DT) return;
	last = now;
	const t = now / 1000;
	for (const e of entries) if (!e.paused) write(e, t);
}

function ensureRunning() {
	if (rafId !== null) return;
	if (typeof requestAnimationFrame !== "function") return;
	rafId = requestAnimationFrame(tick);
}

function stop() {
	if (rafId !== null && typeof cancelAnimationFrame === "function") cancelAnimationFrame(rafId);
	rafId = null;
	last = -Infinity;
}

/** Register a host element; returns a handle to pause or remove it. */
export function registerPulse(
	el: HTMLElement,
	oscillators: Oscillator[],
	hue: { period: number } | null
): PulseHandle {
	const entry: Entry = { el, oscillators, hue, paused: false };
	entries.add(entry);
	ensureRunning();
	return {
		setPaused(paused) {
			entry.paused = paused;
			if (!paused) ensureRunning();
		},
		unregister() {
			entries.delete(entry);
			if (entries.size === 0) stop();
		},
	};
}

/** Test hook: number of registered instances. */
export function pulseEntryCount(): number {
	return entries.size;
}
