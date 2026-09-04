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
 * `getSnapshot` is called by React on every render and again after every store
 * change, so it must not allocate: `window.matchMedia(query)` mints a NEW
 * `MediaQueryList` on each call, and one `useReducedMotion()` in a
 * scroll-driven tree turns that into garbage on every frame. The list is
 * therefore memoised per query, and dropped again on the two events that can
 * make a memoised one wrong:
 *
 * - `window.matchMedia` itself being replaced. The cache is keyed on the
 *   current function as well as the query, which is what keeps the source's
 *   own rationale intact: a test that overrides `matchMedia` wholesale
 *   installs a different function, the key stops matching, and the very next
 *   call resolves against the new implementation.
 * - A `change` event actually firing. A real `MediaQueryList.matches` is live
 *   — the browser updates the object you already hold — but a stub that
 *   captures `matches` at construction is not, and re-resolving once per real
 *   preference change (a rare, user-driven event) costs nothing and makes the
 *   hook correct against both. The subscription itself stays on the list it
 *   was added to, so no listener is stranded.
 *
 * Between those, every render reuses one list. `matches` is a boolean, so
 * snapshot identity is a non-issue either way.
 */

import { useCallback, useSyncExternalStore } from "react";

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function canMatchMedia(): boolean {
	return typeof window !== "undefined" && typeof window.matchMedia === "function";
}

/** The `window.matchMedia` the cache below was built against. A different
 *  function means a different implementation, so the cache is dropped. */
let cachedImpl: typeof window.matchMedia | undefined;
let cache = new Map<string, MediaQueryList>();

/**
 * The `MediaQueryList` for `query`, allocated once per (implementation, query)
 * pair. Called through `window.` rather than a saved reference, because
 * `matchMedia` is a `Window` method and an unbound call throws in a real
 * browser; the saved reference is only ever compared, never invoked.
 */
function mediaQueryList(query: string): MediaQueryList {
	if (cachedImpl !== window.matchMedia) {
		cachedImpl = window.matchMedia;
		cache = new Map();
	}

	const existing = cache.get(query);
	if (existing) return existing;

	const mql = window.matchMedia(query);
	cache.set(query, mql);
	return mql;
}

/** Drop one query's memoised list, so the next snapshot resolves a fresh one. */
function invalidate(query: string): void {
	cache.delete(query);
}

/**
 * `true` while `query` matches. `fallback` is the answer on the server, during
 * hydration, and on a host without `matchMedia` at all.
 */
export function useMediaQuery(query: string, fallback = false): boolean {
	const subscribe = useCallback(
		(onStoreChange: () => void) => {
			if (!canMatchMedia()) return () => {};

			const mql = mediaQueryList(query);
			// Invalidate BEFORE waking React, so the snapshot it reads next is
			// resolved against the media state that just changed.
			const handleChange = () => {
				invalidate(query);
				onStoreChange();
			};

			mql.addEventListener("change", handleChange);
			return () => {
				mql.removeEventListener("change", handleChange);
			};
		},
		[query]
	);

	const getSnapshot = useCallback(() => {
		if (!canMatchMedia()) return fallback;
		return mediaQueryList(query).matches;
	}, [query, fallback]);

	const getServerSnapshot = useCallback(() => fallback, [fallback]);

	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** `useMediaQuery(REDUCED_MOTION_QUERY, false)` — reduced motion is never
 * assumed before the browser has actually been asked. */
export function useReducedMotion(): boolean {
	return useMediaQuery(REDUCED_MOTION_QUERY, false);
}
