/**
 * Optional tactile feedback via `navigator.vibrate` — a touch-only, opt-in
 * add-on (Pressable's `haptic` prop, StatusMorph's `haptic` prop). Nothing
 * here ever throws: the Vibration API is unsupported on most desktop
 * browsers and can be silently refused by a browser policy even where it
 * exists (Safari on iOS has never implemented it, for instance), and a
 * missing rumble is a non-event a user never notices — a thrown error
 * breaking the surrounding click handler very much would be.
 */

export const HAPTIC_PATTERNS = {
	light: 10,
	medium: 25,
	heavy: 50,
	success: [15, 60, 15],
	error: [60, 60, 60, 60, 60],
} as const;
export type HapticPattern = keyof typeof HAPTIC_PATTERNS;

/** Whether this environment can even attempt a vibration. Checked before
 * `vibrate()` calls into the API, and exported separately so a component
 * can skip attaching pointer-tracking work entirely when it never could
 * fire (e.g. gating a touch-only listener without needing to wait for a
 * failed call to find that out). */
export function canVibrate(): boolean {
	return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

/** A named pattern resolves to its numeric/array value; a raw number or
 * array passes straight through. Array patterns are copied out of the
 * frozen `HAPTIC_PATTERNS` tuple so the caller (and `navigator.vibrate`,
 * which mutates nothing but shouldn't be handed a `readonly` array either)
 * never holds a reference into shared, `as const` state. */
function resolvePattern(pattern: HapticPattern | number | number[]): number | number[] {
	if (typeof pattern !== "string") return pattern;
	const value = HAPTIC_PATTERNS[pattern];
	return typeof value === "number" ? value : [...value];
}

/**
 * Fire a vibration pattern. Returns whether the browser accepted the
 * request (`navigator.vibrate`'s own return value) — `false` for
 * "unsupported", "not called from a user gesture", "the tab is
 * backgrounded", or any other reason the platform declines. Never throws:
 * some browsers throw rather than return `false` for a policy refusal, so
 * the whole thing is wrapped rather than trusting the spec's "just returns
 * a boolean" description. The `!== false` coerces `navigator.vibrate`'s
 * result rather than returning it verbatim: lib.dom types the method as
 * always returning `boolean`, but that is a type-level promise the DOM spec
 * does not actually keep — a user agent is free to return `undefined`, and
 * without the coercion this function's own `boolean` return type would be a
 * runtime lie for a caller that checks `=== false`.
 */
export function vibrate(pattern: HapticPattern | number | number[]): boolean {
	try {
		if (!canVibrate()) return false;
		return navigator.vibrate(resolvePattern(pattern)) !== false;
	} catch {
		return false;
	}
}
