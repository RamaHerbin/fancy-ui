/**
 * CSS-only Svelte transition factories built from `presets.ts`'s geometry
 * table. Presence's whole "one `transition:` directive handles both open
 * and close" trick, and StickyScroll's panel crossfade, are both built on
 * this file.
 *
 * How the `easing` param actually reaches the screen is worth spelling out,
 * because it is easy to assume `css(t, u)` needs to apply the curve itself:
 * it does not. Reading Svelte's own transition runtime
 * (`svelte/src/internal/client/dom/elements/transitions.js`, function
 * `animate()`) shows every keyframe is sampled as
 * `t = t1 + delta * easing(i / n)` BEFORE `css(t, 1 - t)` is ever called —
 * so the `t`/`u` a `css()` function receives are ALREADY eased. That is
 * exactly how Svelte's own built-ins behave too (`svelte/transition`'s
 * `blur`/`fade`/`fly`/`scale` all hand their `easing` param straight into
 * the returned `TransitionConfig.easing` field and then use `t`/`u`
 * linearly inside `css()`). `preset()` below does the same: `easing` is
 * resolved once and returned as-is on the config; `cssFor` never touches it.
 */

import type { TransitionConfig } from "svelte/transition";
import { DURATIONS, JS_EASINGS } from "./tokens.js";
import { PRESETS, type PresetName } from "./presets.js";

export interface PresetParams {
	duration?: number;
	delay?: number;
	distance?: number;
	/** A JS easing function — `(t: number) => number` — not a CSS string.
	 * Handed straight to `TransitionConfig.easing`; see the file header for
	 * why `cssFor` never has to apply it itself. */
	easing?: (t: number) => number;
}

const DEFAULT_DISTANCE = 16;

/**
 * Builds the `opacity`/`transform`(/`filter`) CSS string for one sampled
 * frame of `name`'s transition. `t` runs 0 (hidden) → 1 (visible) on intro
 * and the reverse on outro; `u = 1 - t` is "how much of the hidden offset
 * is left". Every preset animates opacity linearly in `t` (visible state IS
 * opacity 1, by construction, so there is nothing preset-specific to
 * compute there). `transform` is only emitted when this preset's geometry
 * actually has a translate or scale term — "fade" has neither, so its CSS
 * string is opacity-only at every frame (never a no-op `transform: none`)
 * — and `filter` is only ever emitted for `"blur"`/`"zoom"`, the two
 * presets whose `PresetGeometry.blur` is set, matching the frozen rule that
 * `filter` is opt-in, never a default.
 */
function cssFor(name: PresetName, t: number, u: number, distance: number): string {
	const geometry = PRESETS[name];
	const declarations = [`opacity: ${t}`];

	const transformTerms: string[] = [];
	if (geometry.x !== undefined || geometry.y !== undefined) {
		const dx = (geometry.x ?? 0) * distance * u;
		const dy = (geometry.y ?? 0) * distance * u;
		transformTerms.push(`translate(${dx}px, ${dy}px)`);
	}
	if (geometry.scale !== undefined) {
		// Interpolates from the hidden-state scale (< 1) up to the resting
		// scale(1) as t goes 0 → 1 — never the other way, so a "scale" preset
		// always grows into place regardless of intro/outro direction.
		transformTerms.push(`scale(${geometry.scale + (1 - geometry.scale) * t})`);
	}
	if (transformTerms.length > 0) {
		declarations.push(`transform: ${transformTerms.join(" ")}`);
	}

	if (geometry.blur !== undefined) {
		declarations.push(`filter: blur(${geometry.blur * u}px)`);
	}

	return declarations.join("; ");
}

/**
 * Returns a Svelte transition function for the named preset, ready for
 * `transition:`/`in:`/`out:`. Resolution order for every param is
 * caller-supplied `params` → this function's own defaults; `duration`
 * defaults to `DURATIONS.base` and `distance` to 16px regardless of
 * direction (a component that wants a shorter/half-distance EXIT, like
 * Presence, passes those explicitly in its own `out`-side params — this
 * factory does not guess at that asymmetry).
 *
 * `easing` is the one default that DOES read `options.direction`: with no
 * explicit `params.easing`, an `"out"`-direction instance (an `out:` or
 * `in:` directive used on its own — StickyScroll's panel crossfade builds
 * one `preset("fade")` and uses it as both `in:fn` and `out:fn`, two
 * separate directive instances) defaults to `JS_EASINGS.in` (a departure
 * curve); anything else (`"in"`, or the unified `"both"` a single
 * `transition:` directive reports — Presence's case) defaults to
 * `JS_EASINGS.out` (an arrival curve, the more common perceived motion of
 * the two when only one curve is in play).
 */
export function preset(
	name: PresetName
): (
	node: Element,
	params?: PresetParams,
	options?: { direction: "in" | "out" | "both" }
) => TransitionConfig {
	return (_node, params = {}, options) => {
		const duration = params.duration ?? DURATIONS.base;
		const delay = params.delay ?? 0;
		const distance = params.distance ?? DEFAULT_DISTANCE;
		const easing = params.easing ?? (options?.direction === "out" ? JS_EASINGS.in : JS_EASINGS.out);

		return {
			delay,
			duration,
			easing,
			css: (t, u) => cssFor(name, t, u, distance),
		};
	};
}
