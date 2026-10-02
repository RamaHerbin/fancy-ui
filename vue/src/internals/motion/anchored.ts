/**
 * The shared scale+opacity transition for floating surfaces — menus, selects,
 * pickers, popovers, tooltips, hover cards. One rung, one curve, one
 * geometry, so twelve panels stop each inventing their own.
 *
 * The name is a slight misnomer for the modal rung: a centred dialog is
 * anchored to nothing, and spends this same function with its own two
 * durations (`DURATIONS.base` in, `DURATIONS.exit` out) rather than the
 * anchored defaults. One geometry in one place was worth more than a synonym,
 * so the modal surfaces call `anchored` too and spell their rung at the call
 * site where the diff can see it.
 *
 * Two pieces that are deliberately kept separate:
 *
 * 1. `anchored()` — a css-only transition (scale + opacity, nothing else). It
 *    never emits `transform-origin`.
 * 2. `originFor()` — a pure lookup the CALLER writes as a static inline
 *    `style={{ transformOrigin }}`. Keeping the origin out of `css()` means it
 *    is inspectable in DevTools, survives a future exit transition, and is
 *    available to any CSS that wants to key off it — none of which is true
 *    of a value smuggled into a per-frame transition string.
 *
 * Why scale + opacity and nothing else: a panel that also translated would
 * fight `anchor-position.ts`'s `position: fixed; left/top` writes on the same
 * element (that module owns those three properties and touches neither
 * `transform` nor `transform-origin`, so the two never collide as written).
 * The travel is not lost, it moves into the origin: growing from the panel
 * edge nearest the trigger reads as "this came out of that button" far more
 * clearly than four pixels of slide ever did.
 *
 * SSR: nothing here touches `window` at module scope. `prefersReducedMotion()`
 * does, but a transition body only ever runs in the browser.
 */

import type { Side, Align } from "../anchor-position.js";
import { DURATIONS, JS_EASINGS } from "./tokens.js";
import { PRESETS } from "./presets.js";
import { REDUCED_MOTION_QUERY } from "./media-query.js";
import type { TransitionSpec, TransitionDirection } from "./transitions.js";

/** Params for `anchored`. Every field is optional; the defaults ARE the
 * anchored rung, so `anchored(node, { side: resolvedSide })` is the whole
 * call site for eleven of the twelve panels. */
export interface AnchoredParams {
	/** The RESOLVED side the surface was placed on — `useAnchorPosition`'s
	 * `onPlacement` value, never the requested one. Drives nothing but the
	 * caller's own `transform-origin`; kept here so one params object feeds
	 * both. Defaults to `"bottom"`, but callers always pass their own
	 * requested side as the seed. */
	side?: Side;
	/** Entrance duration (ms). Defaults to `DURATIONS.fast`. */
	duration?: number;
	/** Exit duration (ms). Defaults to `DURATIONS.fast`. */
	exitDuration?: number;
	/** Delay (ms), entrance only — an exit never waits. Defaults to 0. */
	delay?: number;
	/** `false` drops the scale term, leaving an opacity-only fade (Tooltip).
	 * Defaults to `true`. */
	scale?: boolean;
	/** Direction override, read fresh on every call, for a caller driving ONE
	 * bidirectional transition instance (which reports `direction: "both"`,
	 * and cannot distinguish enter from leave). Unset, direction comes from
	 * `options.direction`. */
	entering?: boolean;
}

/**
 * One-shot read of the user's motion preference.
 *
 * Browser-only, and safe because of where it is called from: a transition body
 * never runs during SSR. NEVER call it at module scope, in a render path, or
 * inside a memo — for a live, reactive answer use `useReducedMotion()` from
 * `media-query.ts` instead. A listener would be pointless here: the value only
 * matters at the instant a one-shot transition starts, and a preference that
 * flips mid-flight should not retro-cancel an animation already on screen.
 *
 * `window.matchMedia` is resolved FRESH on every call, never memoised, for
 * the same reason `media-query.ts` documents at length: a test that overrides
 * `window.matchMedia` wholesale must be visible to the next call.
 */
export function prefersReducedMotion(): boolean {
	if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
	return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * Resolved side + alignment → the `transform-origin` keyword pair that puts
 * the growth origin on the panel edge NEAREST the anchor.
 *
 * The rule behind the twelve entries: the MAIN-axis keyword is the panel edge
 * facing the anchor (`bottom` → `top`, `top` → `bottom`, `left` → `right`,
 * `right` → `left`); the CROSS-axis keyword comes from `align`
 * (`start` → `left`/`top`, `center` → `center`, `end` → `right`/`bottom`).
 * Written out rather than computed so the table can be read against a design
 * doc at a glance. Output is always `"<x> <y>"`.
 *
 * Physical, never logical, and that is deliberate: `computePosition` is
 * physical throughout (`align: "start"` is `anchor.left`, unconditionally),
 * so a physical origin is the CONSISTENT choice under RTL rather than a bug.
 * `transform-origin` has no interoperable logical form anyway.
 */
const ORIGINS: Record<Side, Record<Align, string>> = {
	bottom: { start: "left top", center: "center top", end: "right top" },
	top: { start: "left bottom", center: "center bottom", end: "right bottom" },
	left: { start: "right top", center: "right center", end: "right bottom" },
	right: { start: "left top", center: "left center", end: "left bottom" },
};

export function originFor(side: Side, align: Align = "center"): string {
	return ORIGINS[side][align];
}

/** The entrance floor, read from the shared geometry table rather than
 * retyped, so a change to the creative direction's scale floor lands here
 * too. The `??` is type narrowing for `PresetGeometry.scale`'s optionality —
 * `PRESETS.scale` has always had one, and `anchored.test.tsx` asserts against
 * the table entry rather than the literal so a real removal fails loudly. */
const ENTER_FLOOR = PRESETS.scale.scale ?? 0.92;

/** An exit travels HALF the delta of an entrance (0.96 against 0.92):
 * leaving is a smaller gesture than arriving, and a full-depth collapse on
 * dismiss reads as the panel being sucked away rather than simply closing. */
const EXIT_FLOOR = 1 - (1 - ENTER_FLOOR) / 2;

/**
 * A css-only, direction-aware transition for an anchored floating surface.
 * Entrance: `JS_EASINGS.out` over `DURATIONS.fast`, growing from the scale
 * floor. Exit: `JS_EASINGS.in`, half the depth, and never delayed — a
 * dismissal that waits before starting reads as an unresponsive UI.
 *
 * Reduced motion collapses `duration` (and `delay`) to 0, which makes
 * `runTransition` skip `element.animate()` entirely rather than running a
 * zero-length animation — the same fast path `animate.test.ts` pins down.
 */
export function anchored(
	_node: Element,
	params: AnchoredParams = {},
	options?: { direction: TransitionDirection }
): TransitionSpec {
	// `"both"` (one bidirectional transition instance) counts as entering:
	// it is the only direction the caller cannot resolve for us, and an
	// arrival curve is the more common perceived motion of the two when one
	// has to stand in for both. `params.entering` wins over
	// `options.direction` outright — a caller that passes it has better
	// information than the directive does.
	const entering = params.entering ?? options?.direction !== "out";
	const reduced = prefersReducedMotion();

	const duration = reduced
		? 0
		: entering
			? (params.duration ?? DURATIONS.fast)
			: (params.exitDuration ?? DURATIONS.fast);
	const delay = reduced ? 0 : entering ? (params.delay ?? 0) : 0;
	const easing = entering ? JS_EASINGS.out : JS_EASINGS.in;

	const floor = params.scale === false ? 1 : entering ? ENTER_FLOOR : EXIT_FLOOR;

	return {
		delay,
		duration,
		easing,
		// `t` arrives ALREADY eased (the sampler evaluates `easing(i / n)`
		// before calling `css`), so this interpolates linearly in `t` exactly
		// like `transitions.ts` does. A floor of 1 emits no `transform` at all
		// rather than a no-op `scale(1)`, which keeps an opacity-only panel
		// from acquiring a compositing layer and a stacking context it never
		// asked for.
		css: (t) =>
			floor === 1 ? `opacity: ${t}` : `opacity: ${t}; transform: scale(${floor + (1 - floor) * t})`,
	};
}

/** The `data-state` values a transitioning surface reports. There is no
 *  "closed": a closed surface is not in the DOM. Deliberately two values, not
 *  three — a 150–300 ms entrance has nothing that needs to key off "opening",
 *  and two values means one static attribute plus two one-line handlers
 *  instead of four.
 *
 *  The Svelte side pairs this type with a `markSurfaceState(event, state)`
 *  helper that writes `data-state` IMPERATIVELY from a transition event
 *  handler. That helper is NOT ported (divergence D-2): it exists solely
 *  because Svelte marks a closing `{#if}` branch inert and its scheduler skips
 *  inert effects, so a reactive attribute inside a closing block never reaches
 *  the DOM. React re-renders an exiting surface normally, so a port writes
 *  `data-state={presence.surfaceState}` as an ordinary attribute — same DOM,
 *  same CSS hooks, same two values. */
export type SurfaceState = "open" | "closing";
