/**
 * The shared motion vocabulary for the micro-interaction family: durations,
 * curves, and stagger steps every one of the ten components draws from
 * instead of re-typing its own numbers.
 *
 * This file has zero side effects and touches nothing browser-specific — it
 * is pure data, safe to import at module scope from anywhere, including
 * during SSR. It is also the ONLY place these numbers live as JS values:
 * every component that wants `--ft-ease-out` (or any other `--ft-*` var)
 * still has to type the identical literal into its own scoped `<style>` as
 * that CSS custom property's fallback (this repo ships no shared runtime
 * stylesheet — see `tailwind.css`, a 3-line `@source` stub). Nothing
 * enforces that a component's CSS fallback matches the value here; this file
 * is the source of truth a component author copies FROM, not a value CSS
 * reads at runtime. Keep the two in sync by hand.
 *
 * The four curves intentionally read as this collection's own voice, not as
 * "the house curve" borrowed from anywhere else — `out`/`in` are chosen to
 * have exact `svelte/easing` equivalents (`expoOut`/`expoIn`, see
 * `JS_EASINGS` below) so a component that needs the SAME curve as both a CSS
 * string (`transition-timing-function`) and a JS easing function (a Svelte
 * transition's `easing` field) never has two numbers to keep in sync.
 *
 * One rule about WHERE a consumer may spend these numbers, written down here
 * rather than left as tribal knowledge held by whichever component happened
 * to get it right first: colour-only transitions (`color`,
 * `background-color`, `border-color`) are exempt from
 * `prefers-reduced-motion` gating — a colour change is not motion, and gating
 * it only makes a theme flip look broken for the users who asked for less
 * movement. `transform` / `opacity` / `filter` are NOT exempt and are always
 * declared inside `@media (prefers-reduced-motion: no-preference)`, with the
 * resting state as the ungated fallback.
 */

import { expoIn, expoOut } from "svelte/easing";

/** Milliseconds. `micro` = a glyph-scale beat that only reads as a beat (a
 * stroke draw's lead-in, an icon cross-fade). `fast` = a reversible state
 * flip (press, dim). `base` = the default entrance. `exit` = the default
 * exit (shorter than an entrance — leaving reads faster than arriving).
 * `entrance` = a slower, deliberate reveal (Reveal's default).
 *
 * `micro` is deliberately the one rung with no JS consumer: its consumer is
 * the CSS mirror `--ft-duration-micro: 80ms`, spent by StatusMorph's check
 * and cross-stroke delays. It is listed here anyway because this file is the
 * source of truth a component author copies FROM — a rung that exists only
 * in CSS fallbacks would be exactly the drift this table is meant to stop.
 * There is one rung at this scale, not two: StatusMorph's paired `160ms` is
 * written as a literal on purpose rather than tokenised as a second rung. */
export const DURATIONS = {
	micro: 80,
	fast: 150,
	base: 300,
	exit: 200,
	entrance: 600,
} as const;
export type DurationToken = keyof typeof DURATIONS;

/** CSS `cubic-bezier()` strings — for a component's own `<style>` block,
 * never injected by this file. */
export const EASINGS = {
	out: "cubic-bezier(0.16, 1, 0.3, 1)", // arrivals   ↔ svelte/easing expoOut
	in: "cubic-bezier(0.7, 0, 0.84, 0)", // departures ↔ expoIn
	inout: "cubic-bezier(0.4, 0, 0.2, 1)", // reversible state ↔ cubicInOut (approx)
	overshoot: "cubic-bezier(0.34, 1.56, 0.64, 1)", // StatusMorph check only ↔ backOut
} as const;
export type EasingToken = keyof typeof EASINGS;

/** The same two arrival/departure curves as real JS functions, for
 * `transitions.ts`'s `preset()` — a Svelte `TransitionConfig.easing` field
 * wants a `(t: number) => number`, not a CSS string. Only `out`/`in` exist
 * here: `inout` never drives a JS-timed transition (it is CSS-only, for
 * hover/press states that have no discrete start/end), and `overshoot` has
 * exactly one consumer (StatusMorph's success check, which computes its own
 * `scale` pop rather than going through `preset()`). */
export const JS_EASINGS = { out: expoOut, in: expoIn } as const;

/** Milliseconds per stagger step, before any compression cap is applied.
 * `char`/`charBlur` are TextRoll's per-grapheme step (plain vs. its
 * heavier blur variant); `word`/`line` are illustrative rungs for
 * pretext-driven text layout elsewhere in the library, kept here so a
 * future consumer doesn't invent a fifth number; `item` is Reveal's
 * per-child step. */
export const STAGGERS = { char: 15, charBlur: 20, word: 40, line: 150, item: 50 } as const;

/** Total-delay compression caps (ms) — see `stagger.ts`'s `staggerDelay`.
 * `text` bounds TextRoll's per-grapheme roll; `item` bounds Reveal's
 * per-child stagger. A list long enough to blow past its step × count
 * without one of these would stop reading as "staggered" and start reading
 * as "the last item is stuck". */
export const STAGGER_CAPS = { text: 200, item: 600 } as const;
