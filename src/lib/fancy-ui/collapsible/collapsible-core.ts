/**
 * The framework-free half of the collapse motion, shared byte for byte by the
 * Svelte, React and Vue packages.
 *
 * `CollapsibleContent` animates `grid-template-rows` between `0fr` and `1fr`
 * and has to know when that transition is over, to take the panel out of the
 * tab order and the accessibility tree. `transitionend` is the signal, but it
 * never arrives when the transition did not run: reduced motion, a stylesheet
 * that declares no duration, a panel inside a hidden ancestor. These helpers
 * turn the element's own computed transition into a deadline so the panel
 * settles in every one of those cases, and never earlier than its animation.
 */

/** The media query that switches the motion off. */
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Milliseconds assumed when the element declares no transition timing at all
 * (a computed style that is empty, as in a test DOM with no stylesheet).
 */
export const DEFAULT_SETTLE_MS = 300;

/** Slack added on top of a declared transition so `transitionend` wins the race. */
export const SETTLE_SLACK_MS = 60;

/** The `transitionend` property name of the collapse. */
export const COLLAPSE_PROPERTY = "grid-template-rows";

/** One-shot read of the user's motion preference; `false` where `matchMedia` is missing. */
export function prefersReducedMotionNow(): boolean {
	if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
	return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** `"0.2s, 150ms"` to `[200, 150]`; a token that is not a time becomes `NaN`. */
export function parseTimeList(value: string): number[] {
	return value
		.split(",")
		.map((token) => token.trim())
		.filter((token) => token !== "")
		.map((token) => {
			const match = /^(-?\d*\.?\d+)(ms|s)$/.exec(token);
			if (!match) return Number.NaN;
			return Number.parseFloat(match[1] ?? "") * (match[2] === "s" ? 1000 : 1);
		});
}

/** The slice of a computed style the deadline reads. */
export interface TransitionTiming {
	transitionDuration: string;
	transitionDelay: string;
}

/**
 * How long to wait for `transitionend` before settling the panel anyway.
 *
 * `0` means "settle now": the user asked for reduced motion, or the element's
 * longest declared transition lasts no time at all, so no event will come.
 * Anything else is the declared duration plus its delay plus a little slack;
 * an element that declares nothing waits `DEFAULT_SETTLE_MS`.
 */
export function settleDelayMs(timing: TransitionTiming | null, reduced: boolean): number {
	if (reduced) return 0;
	const durations = timing ? parseTimeList(timing.transitionDuration).filter(Number.isFinite) : [];
	if (durations.length === 0) return DEFAULT_SETTLE_MS + SETTLE_SLACK_MS;
	const delays = parseTimeList(timing?.transitionDelay ?? "").filter(Number.isFinite);
	const total = Math.max(
		...durations.map(
			(duration, index) => duration + (delays[index % Math.max(delays.length, 1)] ?? 0)
		)
	);
	return total <= 0 ? 0 : total + SETTLE_SLACK_MS;
}

/** Whether a `transitionend` is the collapse of this very panel, not a child's or another property's. */
export function isCollapseEnd(event: {
	target: unknown;
	currentTarget: unknown;
	propertyName: string;
}): boolean {
	return event.target === event.currentTarget && event.propertyName === COLLAPSE_PROPERTY;
}
