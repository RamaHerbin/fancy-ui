/**
 * Trailing-edge rAF throttle, generalized from the hand-rolled
 * `if (id) cancelAnimationFrame(id); id = requestAnimationFrame(...)` pattern
 * already duplicated in this repo (GlowingEffect's pointer sampling). Magnetic
 * (pointermove) and ScrollProgress (scroll/resize) both need "run at most
 * once per frame, with the freshest data" — this is that primitive, pulled
 * out once instead of re-hand-rolled a third and fourth time.
 */

export interface RafThrottled<A extends unknown[]> {
	(...args: A): void;
	/** Cancel a pending (not-yet-run) frame. A safe no-op if none is pending. */
	cancel(): void;
}

/**
 * Wraps `fn` so a burst of synchronous calls collapses into ONE
 * `requestAnimationFrame` callback, called with the LATEST call's
 * arguments — never the first.
 *
 * Deliberately does NOT cancel-and-reschedule on every call (the
 * `cancelAnimationFrame(frame); frame = requestAnimationFrame(...)` shape
 * some throttles use). That pattern resets the wait on every single call,
 * so a continuous stream faster than one call per frame — the ENTIRE
 * reason to throttle in the first place — would push the scheduled frame
 * back forever and `fn` would never run until the stream paused. Storing
 * the latest args and letting the frame ALREADY in flight pick them up
 * guarantees `fn` runs at most once per frame no matter the input rate,
 * and the one frame that does run always reflects where things ended up.
 *
 * Falls back to a synchronous call when `requestAnimationFrame` itself is
 * unavailable (checked per call, not once at creation, since every real
 * call site is browser-only by construction and this only matters for a
 * pathological/non-browser caller) — failing to run at all would be worse
 * than running un-throttled.
 */
export function rafThrottle<A extends unknown[]>(fn: (...args: A) => void): RafThrottled<A> {
	let frame: number | undefined;
	let lastArgs: A;

	function throttled(...args: A): void {
		lastArgs = args;

		if (typeof requestAnimationFrame !== "function") {
			fn(...args);
			return;
		}

		if (frame !== undefined) return;
		frame = requestAnimationFrame(() => {
			frame = undefined;
			fn(...lastArgs);
		});
	}

	throttled.cancel = () => {
		if (frame !== undefined) {
			if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(frame);
			frame = undefined;
		}
	};

	return throttled as RafThrottled<A>;
}
