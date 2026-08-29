/**
 * Per-item delay arithmetic for a staggered entrance — the one formula
 * Reveal's per-child stagger and TextRoll's per-grapheme roll both build on,
 * so "stagger from the center" or "stagger from the last item" means the
 * same thing everywhere in this family.
 *
 * Deliberately pure: no DOM, no timers, no side effects, no hook. A caller
 * is expected to call this once per item straight from the render path and
 * write the result into a CSS custom property or a transition `delay` param
 * — this file never schedules anything itself.
 */

export type StaggerFrom = "first" | "last" | "center" | number;

/** How far item `index` sits from the stagger's origin, in item-steps
 * (not ms yet — `staggerDelay` multiplies this by the step). A numeric
 * `from` is honoured exactly as given, even outside `[0, count - 1]`:
 * clamping it would silently change what a caller asked for, and an
 * origin outside the list is a legitimate way to make one edge stagger in
 * later than the other. */
function distanceFromOrigin(index: number, count: number, from: StaggerFrom): number {
	if (from === "first") return index;
	if (from === "last") return count - 1 - index;
	if (from === "center") return Math.abs(index - (count - 1) / 2);
	return Math.abs(index - from);
}

/**
 * The delay (ms) item `index` of `count` should wait before starting its
 * own entrance, staggered by `step` ms per item away from `from`.
 *
 * `cap`, when given, is a TOTAL-delay ceiling reached by COMPRESSING the
 * step, never by clipping individual delays: `effStep = min(step, cap /
 * max(1, count - 1))`. A 40-item list at the usual 50ms/item step would
 * otherwise finish its LAST item's entrance 1950ms after the first one —
 * long enough to read as "the list is still loading", not "staggered".
 * Compressing the step instead keeps every item's delay proportional to
 * its distance from the origin (the ordering and relative spacing survive
 * intact), just packed into a shorter total window. The cap is computed
 * against `count - 1` regardless of `from` — exact for `"first"`/`"last"`
 * (whose maximum distance IS `count - 1`), and a safe (non-tight) bound
 * for `"center"` or a numeric origin inside the list, whose maximum
 * distance is smaller. An origin far outside the list can still exceed
 * the cap in absolute ms — a deliberate consequence of not clamping
 * `from` above, not a bug in the cap.
 */
export function staggerDelay(
	index: number,
	count: number,
	step: number,
	from: StaggerFrom = "first",
	cap?: number
): number {
	if (count <= 1) return 0;
	const effStep = cap === undefined ? step : Math.min(step, cap / Math.max(1, count - 1));
	return distanceFromOrigin(index, count, from) * effStep;
}
