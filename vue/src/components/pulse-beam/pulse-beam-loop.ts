/**
 * PulseBeam — thin adapter over the shared frame ticker.
 *
 * Each instance registers its host element plus its oscillator set; every
 * frame writes the animated custom properties straight onto `el.style` (no
 * framework reactivity in the hot path). The ticker supplies the single shared
 * frame request, the 256px viewport gate and the document-visibility pause.
 *
 * Throttled to ~30 fps: the blobs are soft and slow, 60 fps is invisible here
 * and doubles the style-recalc cost.
 *
 * Nothing here touches `window` at module evaluation time — safe under SSR.
 */
import { subscribe } from "../../internals/motion/ticker.js";
import { oscillate, type Oscillator } from "./pulse-beam-data.js";

interface Entry {
	el: HTMLElement;
	oscillators: Oscillator[];
	hue: { period: number } | null;
}

export interface PulseHandle {
	setPaused(paused: boolean): void;
	unregister(): void;
}

const entries = new Set<Entry>();

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

/** Register a host element; returns a handle to pause or remove it. */
export function registerPulse(
	el: HTMLElement,
	oscillators: Oscillator[],
	hue: { period: number } | null
): PulseHandle {
	const entry: Entry = { el, oscillators, hue };
	entries.add(entry);
	const sub = subscribe({ el, fps: 30, onFrame: (_dt, now) => write(entry, now / 1000) });
	return {
		setPaused(paused) {
			sub.setPaused(paused);
		},
		unregister() {
			entries.delete(entry);
			sub.unsubscribe();
		},
	};
}

/** Test hook: number of registered instances. */
export function pulseEntryCount(): number {
	return entries.size;
}
