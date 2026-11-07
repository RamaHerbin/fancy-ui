/**
 * The motion vocabulary as pure data: durations, curves, stagger steps, the
 * stagger cap ramp and the hover pair. No imports, no globals, nothing
 * framework-specific — this file is byte-identical in the Svelte, React and
 * Vue packages (`check:cores`) and is what `scripts/gen-motion-tokens.mjs`
 * reads to write the `--ft-*` declarations into each package's
 * `tailwind.css`. The per-framework `tokens.ts` re-exports it and adds the
 * JS easing functions on top.
 *
 * Colour-only transitions (`color`, `background-color`, `border-color`) are
 * exempt from `prefers-reduced-motion` gating — a colour change is not
 * motion. `transform` / `opacity` / `filter` are not exempt and are always
 * declared inside `@media (prefers-reduced-motion: no-preference)`, with the
 * resting state as the ungated fallback.
 */

/** Milliseconds. `micro` = a glyph-scale beat that only reads as a beat (a
 * stroke draw's lead-in, an icon cross-fade). `fast` = a reversible state
 * flip (press, dim). `base` = the default entrance. `exit` = the default
 * exit (shorter than an entrance — leaving reads faster than arriving).
 * `entrance` = a slower, deliberate reveal (Reveal's default).
 *
 * `micro` is deliberately the one rung with no JS consumer: its consumer is
 * the CSS mirror `--ft-duration-micro: 80ms`, spent by StatusMorph's check
 * and cross-stroke delays. There is one rung at this scale, not two:
 * StatusMorph's paired `160ms` is written as an annotated literal on purpose
 * rather than tokenised as a second rung. */
export const DURATIONS = {
	micro: 80,
	fast: 150,
	base: 300,
	exit: 200,
	entrance: 600,
} as const;
export type DurationToken = keyof typeof DURATIONS;

/** CSS `cubic-bezier()` strings. `out`/`in` have exact JS equivalents
 * (`expoOut`/`expoIn`, see `JS_EASINGS` in `tokens.ts`) so a component that
 * needs the SAME curve as both a CSS string and a JS easing function never
 * has two numbers to keep in sync.
 *
 * Exits decelerate too (owner ruling, 2026-10-24): a dismissal uses `out`
 * over a shorter duration or a shallower depth. `in` is reserved for a
 * departure that hands off to an entrance it visibly continues (text-roll's
 * wheel). */
export const EASINGS = {
	out: "cubic-bezier(0.16, 1, 0.3, 1)", // arrivals and exits ↔ expoOut
	in: "cubic-bezier(0.7, 0, 0.84, 0)", // a departure that continues into an entrance ↔ expoIn
	inout: "cubic-bezier(0.4, 0, 0.2, 1)", // reversible state ↔ cubicInOut (approx)
	overshoot: "cubic-bezier(0.34, 1.56, 0.64, 1)", // StatusMorph check only ↔ backOut
} as const;
export type EasingToken = keyof typeof EASINGS;

/** Milliseconds per stagger step, before any compression cap is applied.
 * `char`/`charBlur` are TextRoll's per-grapheme step (plain vs. its
 * heavier blur variant); `word`/`line` are illustrative rungs for
 * pretext-driven text layout elsewhere in the library, kept here so a
 * future consumer doesn't invent a fifth number; `item` is Reveal's
 * per-child step. */
export const STAGGERS = { char: 15, charBlur: 20, word: 40, line: 150, item: 50 } as const;
export type StaggerToken = keyof typeof STAGGERS;

/** The total-delay ceiling of a stagger ramps with item size: glyphs and
 * rows (≤ 48 px) get 200 ms, cards (≥ 448 px) 600 ms, linear in between
 * (1 ms per px with these numbers). One formula instead of two named caps,
 * so a list of thumbnails is not timed like a wall of cards. Spent through
 * `staggerCap(itemSizePx)` in `stagger.ts`. */
export const STAGGER_CAP = { floor: 200, ceil: 600, fromPx: 48, toPx: 448 } as const;

/** Hover/focus timing. In = `fast`, out = `exit`, both on `out`: a return
 * settles, it never bounces (overshoot belongs to arrivals). An intent
 * delay is allowed on the IN side only (Tooltip). The CSS side is the pair
 * `--ft-hover-in` / `--ft-hover-out` (`<duration> <curve>`), usable as
 * `transition: transform var(--ft-hover-in, 150ms cubic-bezier(0.16, 1, 0.3, 1))`. */
export const HOVER = {
	in: { duration: "fast", easing: "out" },
	out: { duration: "exit", easing: "out" },
} as const satisfies Record<"in" | "out", { duration: DurationToken; easing: EasingToken }>;
