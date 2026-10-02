/**
 * The two curves `JS_EASINGS` names, inlined because the framework's easing
 * module cannot become a runtime dependency of this package (divergence D-7 in
 * the internals contract). Closed forms, copied byte-for-byte — do NOT "clean
 * up" the endpoint guards; they are the shape of the curve at exactly the
 * points `css()` is sampled at.
 *
 * Pure data-shaped functions: no side effects, no browser globals, safe to
 * import at module scope during SSR.
 */

/** Departure curve. `t === 0` is guarded so the curve starts at exactly 0
 * rather than at `2 ** -10`. */
export function expoIn(t: number): number {
	return t === 0.0 ? t : Math.pow(2.0, 10.0 * (t - 1.0));
}

/** Arrival curve. `t === 1` is guarded so the curve ends at exactly 1 rather
 * than at `1 - 2 ** -10`. */
export function expoOut(t: number): number {
	return t === 1.0 ? t : 1.0 - Math.pow(2.0, -10.0 * t);
}

/** The identity curve. Not referenced by `JS_EASINGS`; exported for a caller
 * that wants to opt a single transition out of easing entirely without
 * hand-rolling `(t) => t` at the call site. */
export const linear: (t: number) => number = (t) => t;
