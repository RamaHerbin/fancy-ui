/**
 * Seeding for RimLight arcs. Pure, so tests and SSR read the same numbers.
 *
 * Neighbours must never match: the start angle steps by the golden angle, the
 * arc length and the accent change on different cycles, and every third rim
 * runs counter-clockwise.
 */

export type RimTier = "hero" | "search" | "card" | "selected" | "cta";
export type RimAccent = "green" | "amber";

export interface RimSeed {
	/** Arc start, degrees clockwise from the top. */
	start: number;
	/** Arc length, degrees (110–159). */
	arc: number;
	accent: RimAccent;
	direction: "cw" | "ccw";
}

const GOLDEN_ANGLE = 137.5;

export function rimSeed(seed: number): RimSeed {
	const i = Math.abs(Math.trunc(Number.isFinite(seed) ? seed : 0));
	return {
		start: (i * GOLDEN_ANGLE) % 360,
		// (i·53) mod 50 ≡ 3i mod 50 would step neighbours by only 3°; ×31
		// spreads them (110, 141, 122, 153, 134, 115…) over the same range.
		arc: 110 + ((i * 31) % 50),
		accent: i % 2 ? "amber" : "green",
		direction: i % 3 === 2 ? "ccw" : "cw",
	};
}

/**
 * Brings `next` (degrees) to the equivalent angle closest to `previous`, so a
 * transition on the arc centre takes the short way round (350° → 10° moves
 * +20°, not −340°).
 */
export function unwrapAngle(previous: number, next: number): number {
	const delta = ((((next - previous) % 360) + 540) % 360) - 180;
	return previous + delta;
}
