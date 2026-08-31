import { useCallback, useInsertionEffect, useRef } from "react";

/**
 * A permanently identity-stable wrapper that always calls the most recent `fn`.
 * `undefined` yields a stable no-op returning `undefined`.
 *
 * The ref is written inside `useInsertionEffect`, NOT during render. Insertion effects
 * run before every layout effect, so a listener always sees the current callback, and
 * a concurrent render that React throws away can never publish a stale one. This is
 * the React counterpart of the getter-object call sites the Svelte sources use.
 *
 * Every `on*` option on every internals hook goes through this. It is also why
 * anchor-position's `newOpts.onPlacement !== options.onPlacement` reset branch is
 * unreachable from the hook path: the identity never changes.
 */
export function useEventCallback<A extends unknown[], R>(
	fn: ((...args: A) => R) | undefined
): (...args: A) => R | undefined {
	// Seeded with the first render's `fn` so a call made before the first
	// insertion effect — a mount-time layout effect — already reaches it.
	const ref = useRef<((...args: A) => R) | undefined>(fn);

	useInsertionEffect(() => {
		ref.current = fn;
	}, [fn]);

	return useCallback((...args: A) => ref.current?.(...args), []);
}
