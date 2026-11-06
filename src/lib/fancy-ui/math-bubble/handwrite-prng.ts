/**
 * Seeded randomness for the hand (shared core: byte-identical in the Svelte, React and Vue
 * packages). Every "random" choice in the handwriting goes through here, so the same seed always
 * writes the same strokes, on the server and in the browser.
 */

export type Rng = () => number;

/** mulberry32: a tiny 32-bit generator, uniform in [0, 1). */
export function mulberry32(seed: number): Rng {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Uniform in [-amp, amp]. */
export function jitter(rng: Rng, amp: number): number {
	return (rng() * 2 - 1) * amp;
}

/** Uniform in [min, max). */
export function range(rng: Rng, min: number, max: number): number {
	return min + rng() * (max - min);
}

/** Derives an independent seed from a base seed and an integer salt (one stream per glyph). */
export function hashSeed(seed: number, salt: number): number {
	let h = (seed ^ Math.imul(salt + 0x9e3779b9, 0x85ebca6b)) >>> 0;
	h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
	h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0;
	return (h ^ (h >>> 16)) >>> 0;
}

/** A seed from a string (FNV-1a), so a formula can seed its own hand. */
export function seedFromString(text: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < text.length; i++) {
		h ^= text.charCodeAt(i);
		h = Math.imul(h, 0x01000193) >>> 0;
	}
	return h >>> 0;
}
