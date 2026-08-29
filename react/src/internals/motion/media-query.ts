/**
 * Live `matchMedia` state as a hook.
 *
 * `useSyncExternalStore`, and this file is the archetype for choosing it: a
 * store React does not own, mutated outside React's knowledge, that must not
 * tear across a concurrent render — and whose `getServerSnapshot` returns
 * `fallback` for the server render AND the hydration render, which eliminates
 * the whole mismatch class rather than papering over it. A
 * `useState` + `useEffect` version reaches the same end state with one extra
 * committed frame and a real hydration mismatch the moment someone
 * "optimises" the initializer into a lazy `window.matchMedia` read.
 *
 * The Svelte source's `start()`/`stop()` pair has no counterpart here (D-4): it
 * exists only because that framework has no lifecycle-bound reactive
 * primitive, so the factory had to be constructible during SSR before any
 * effect ran. `useSyncExternalStore` IS that lifecycle, with the hydration
 * guarantee on top. The consuming pattern collapses from three lines to
 * `const reduced = useReducedMotion();`.
 *
 * `window.matchMedia(query)` is resolved FRESH on every subscribe and every
 * snapshot, never memoised at module or hook scope — carried over verbatim
 * from the source's rationale: a test that overrides `window.matchMedia`
 * wholesale must be visible to the very next call, and caching either the
 * `MediaQueryList` or even just the `matchMedia` function reference would make
 * that override invisible to a component that mounted before it was installed.
 * `matches` is a boolean, so snapshot identity is a non-issue.
 */

import { useCallback, useSyncExternalStore } from "react";

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function canMatchMedia(): boolean {
	return typeof window !== "undefined" && typeof window.matchMedia === "function";
}

/**
 * `true` while `query` matches. `fallback` is the answer on the server, during
 * hydration, and on a host without `matchMedia` at all.
 */
export function useMediaQuery(query: string, fallback = false): boolean {
	const subscribe = useCallback(
		(onStoreChange: () => void) => {
			if (!canMatchMedia()) return () => {};

			const mql = window.matchMedia(query);
			mql.addEventListener("change", onStoreChange);
			return () => {
				mql.removeEventListener("change", onStoreChange);
			};
		},
		[query]
	);

	const getSnapshot = useCallback(() => {
		if (!canMatchMedia()) return fallback;
		return window.matchMedia(query).matches;
	}, [query, fallback]);

	const getServerSnapshot = useCallback(() => fallback, [fallback]);

	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** `useMediaQuery(REDUCED_MOTION_QUERY, false)` — reduced motion is never
 * assumed before the browser has actually been asked. */
export function useReducedMotion(): boolean {
	return useMediaQuery(REDUCED_MOTION_QUERY, false);
}
