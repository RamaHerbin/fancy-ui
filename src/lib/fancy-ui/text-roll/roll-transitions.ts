/**
 * `rollIn` / `rollOut` — the per-grapheme cell transitions TextRoll's overlay
 * layer runs on `in:`/`out:`. Unlike `_internals/motion/transitions.ts`'s
 * `preset()` (one shared geometry table shared by Reveal/Presence/
 * StickyScroll), these two are specific to TextRoll's own "rolling cylinder"
 * geometry and its own per-cell stagger bookkeeping, so they live next to the
 * component that uses them instead of in the shared foundation — the frozen
 * contract draws exactly this line (`text-roll/roll-transitions.ts`, not
 * `_internals/motion/`), and the foundation exports nothing named `rollIn`/
 * `rollOut` for this file to wrap.
 *
 * Both are css-only Svelte transitions (a `css(t, u)` string, no `tick`) —
 * the same WAAPI mechanism `preset()` uses, so the same fact its file header
 * documents applies unchanged here: Svelte samples `t`/`u` from its OWN
 * easing curve before `css()` ever runs, so `easing` only has to be handed
 * through on the returned `TransitionConfig`, never applied a second time
 * inside `cssForRoll`.
 */

import type { TransitionConfig } from "svelte/transition";
import { DURATIONS, JS_EASINGS, STAGGER_CAPS } from "../_internals/motion/tokens.js";
import { staggerDelay, type StaggerFrom } from "../_internals/motion/stagger.js";

export interface RollTransitionParams {
	/**
	 * "up" mirrors an odometer counting up: an entering cell rises from
	 * below into place, a leaving cell continues rising off the top. "down"
	 * is the mirror image. `in:rollIn` and `out:rollOut` on the SAME roll
	 * always receive the same `direction` — a same-length update at one
	 * position runs its exit and entrance as one coherent turn, not two
	 * independently-decided fades.
	 */
	direction: "up" | "down";
	/** ms. `0` (reduced motion, written by the component) makes Svelte's own
	 * transition runtime short-circuit synchronously — nothing in this file
	 * has to special-case that. */
	duration?: number;
	/**
	 * This cell's own position, frozen into the cell object by TextRoll at
	 * the render that created it — so a cell being REMOVED keeps the index
	 * it actually held there rather than one recomputed against whatever
	 * replaced it.
	 */
	index: number;
	/**
	 * The CURRENT (new) value's grapheme count — deliberately the SAME
	 * number for every cell in one roll, entering and leaving alike, so a
	 * `from="center"` sweep reads as one sweep across the new shape rather
	 * than two sweeps computed against two different lengths (only possible
	 * to observe on a length-changing update, where old and new counts
	 * differ; on the far more common same-length update they are already
	 * identical).
	 */
	count: number;
	/** The `stagger` prop's per-step ms — already collapsed to `0` under
	 * reduced motion by the component. This file applies `STAGGER_CAPS.text`
	 * compression on top, via the shared `staggerDelay` helper (compression,
	 * never per-cell clipping — see that file). */
	step: number;
	/** Stagger origin, forwarded from the `from` prop. Omitted, `staggerDelay`
	 * falls back to its own `"first"` default. */
	from?: StaggerFrom;
}

function delayFor(params: RollTransitionParams): number {
	return staggerDelay(params.index, params.count, params.step, params.from, STAGGER_CAPS.text);
}

/**
 * Both directions share one geometry: the hidden-state offset is
 * `sign * var(--ft-textroll-distance, 1em) * u` — the same "u scales the
 * hidden-state offset toward zero as the transition completes" shape
 * `transitions.ts`'s `cssFor` uses for Reveal/Presence's directional
 * presets. `rollIn`/`rollOut` differ only in which `sign` they pass.
 * `--ft-textroll-distance` is read here, not written by the component (no
 * `distance` prop exists — see the README) — a consumer overrides travel by
 * setting this var on `.ft-textroll` from their own CSS.
 */
function cssForRoll(sign: 1 | -1, t: number, u: number): string {
	return `opacity: ${t}; transform: translateY(calc(${sign} * var(--ft-textroll-distance, 1em) * ${u}))`;
}

/**
 * A cell arriving at its slot. `direction="up"`: rises from below
 * (`+distance`) into place. `direction="down"`: descends from above
 * (`-distance`) into place.
 */
export function rollIn(_node: Element, params: RollTransitionParams): TransitionConfig {
	const sign = params.direction === "up" ? 1 : -1;
	return {
		duration: params.duration ?? DURATIONS.base,
		delay: delayFor(params),
		easing: JS_EASINGS.out,
		css: (t, u) => cssForRoll(sign, t, u),
	};
}

/**
 * A cell leaving its slot, continuing the SAME rotation the entering cell
 * (`rollIn`, above) is completing: `direction="up"` exits upward (toward
 * `-distance`), `direction="down"` exits downward — the OPPOSITE sign from
 * `rollIn`'s for the same `direction`, which is exactly what makes the two
 * read as one wheel turning rather than two unrelated fades.
 */
export function rollOut(_node: Element, params: RollTransitionParams): TransitionConfig {
	const sign = params.direction === "up" ? -1 : 1;
	return {
		duration: params.duration ?? DURATIONS.base,
		delay: delayFor(params),
		easing: JS_EASINGS.in,
		css: (t, u) => cssForRoll(sign, t, u),
	};
}
