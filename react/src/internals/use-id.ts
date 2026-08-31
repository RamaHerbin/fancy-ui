// Ids for components that need to wire up aria-labelledby / aria-describedby
// without colliding across instances.
//
// Two generators, and the choice between them is not a matter of taste:
//
// `useFancyId()` is THE id source a component reaches for. It wraps React's
// `useId()`, so the id is identical in the server HTML and in the hydration
// render — the counterpart of the Svelte side's `$props.id()`. Derive every
// sub-id by suffixing one seed (`${id}-description`, `${id}-error`) rather
// than calling it once per id.
//
// `uid()` is the module-scoped counter, kept for an id minted inside an event
// handler or an effect. CLIENT-ONLY, and it throws rather than letting the
// mistake through: the counter is shared by every request on a long-lived
// server while a freshly loaded client bundle always restarts at 1, so an id
// generated during SSR would never match the one the client regenerates on
// hydration.
//
// The output of `useFancyId()` is NOT transformed. React's ids contain
// delimiters (`:r0:` on 18, `«r0»` on 19) which are legal in `id`/`aria-*`
// and in `getElementById`, and illegal in an unescaped `querySelector` — so
// no id from here may ever become a CSS selector.

import { useId } from "react";

let n = 0;

/**
 * A unique, SSR-stable id string for the calling component instance, e.g.
 * "fui-«r0»". Stable across the server render and hydration, and stable for
 * the life of the component.
 *
 * Call it once and suffix the result for every id the component needs; a
 * second call is a second seed, not a second id off the same one.
 *
 * @param prefix - Prefix for the generated id (defaults to "fui").
 */
export function useFancyId(prefix = "fui"): string {
	const id = useId();
	return `${prefix}-${id}`;
}

/**
 * Returns a unique, stable id string, e.g. "fui-1", "fui-2", ...
 *
 * Client-only: throws when called on the server, since the id produced
 * there would not match the one the client regenerates on hydration. Call
 * this only from browser-only code paths (effects, event handlers) — use
 * `useFancyId()` for ids that must survive SSR + hydration.
 *
 * @param prefix - Prefix for the generated id (defaults to "fui").
 */
export function uid(prefix = "fui"): string {
	if (typeof window === "undefined") {
		throw new Error(
			"uid() is client-only and must not be called during SSR; use useFancyId() for SSR-stable ids."
		);
	}

	n += 1;
	return `${prefix}-${n}`;
}
