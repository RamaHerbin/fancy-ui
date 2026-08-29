import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";

/**
 * `useLayoutEffect` in the browser, `useEffect` on the server. Everything whose
 * absence is visible in the first painted frame — position, focus, scroll lock, a
 * transition leg — runs through this.
 *
 * The branch is taken once at module scope, never in a render path, so it costs
 * nothing per render and cannot desynchronise a hydration.
 */
export const useIsomorphicLayoutEffect: typeof useLayoutEffect =
	typeof document !== "undefined" ? useLayoutEffect : useEffect;

const emptySubscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * `false` on the server AND during the hydration render, `true` from the first
 * post-hydration render on. useSyncExternalStore, not useState+useEffect: no extra
 * commit, and tear-free under concurrent rendering.
 */
export function useIsHydrated(): boolean {
	return useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot);
}

/** Nothing a caller can produce is this symbol, so it is a safe "not created yet". */
const UNSET = Symbol("useConstant.unset");

/**
 * Lazily create a per-instance value exactly once. StrictMode-safe only because every
 * `create*` factory in this contract is allocation-only — no listeners, no timers.
 */
export function useConstant<T>(create: () => T): T {
	const ref = useRef<T | typeof UNSET>(UNSET);
	if (ref.current === UNSET) ref.current = create();
	return ref.current as T;
}
