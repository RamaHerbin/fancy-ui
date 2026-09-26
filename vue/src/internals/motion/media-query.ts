import { ref } from "vue";

/**
 * Reactive `matchMedia` state, in the same shape as the Svelte source's
 * `createElapsed`: a factory returning a frozen object with getters (never a
 * `ref` handed out directly, so a consumer can read `.current` but never
 * assign into it) plus `start()`/`stop()`. Nothing touches `window` at
 * construction time — only `start()` does — which is what keeps this safe to
 * build during SSR and safe to build before a component's own effect runs:
 *
 * ```ts
 * const reduced = createReducedMotion();
 * watch(..., () => reduced.start());
 * ```
 */

export interface MediaQueryState {
	readonly current: boolean;
	/** Start (or restart) tracking. Returns the matching stop function, so
	 * a mounted hook's cleanup can call the returned function directly. */
	start(): () => void;
	stop(): void;
}

export function createMediaQuery(query: string, fallback = false): MediaQueryState {
	const current = ref(fallback);
	let mql: MediaQueryList | undefined;
	let handleChange: ((event: MediaQueryListEvent) => void) | undefined;

	/** Detaches the listener. `current` is left at whatever it last observed
	 * (NOT reset to `fallback`) — a stopped query still reflects the last
	 * real answer the browser gave, rather than silently reverting to a
	 * value that may no longer be true. The documented `start()` pattern
	 * never reads `.current` after its own cleanup runs, so this only
	 * matters to a caller that calls `stop()` directly and keeps reading
	 * `.current` afterward. */
	function stop() {
		if (mql && handleChange) mql.removeEventListener("change", handleChange);
		mql = undefined;
		handleChange = undefined;
	}

	function start() {
		// A restart (start() called again while already running) tears down
		// the previous listener first, so two live handlers never race each
		// other into flipping `current` twice for one real change.
		stop();

		if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
			current.value = fallback;
			return stop;
		}

		// `window.matchMedia(query)` is called FRESH here, on every start() —
		// never cached at module or factory-construction scope. A test that
		// wants to force a branch overrides `window.matchMedia` wholesale
		// and expects the NEXT call to see the override; caching the
		// MediaQueryList (or even just the `matchMedia` function reference)
		// from an earlier call would make that override invisible to a
		// component that was constructed before the test installed it.
		mql = window.matchMedia(query);
		current.value = mql.matches;
		handleChange = (event) => {
			current.value = event.matches;
		};
		mql.addEventListener("change", handleChange);

		return stop;
	}

	return Object.freeze({
		get current() {
			return current.value;
		},
		start,
		stop,
	});
}

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** `createMediaQuery(REDUCED_MOTION_QUERY, false)` — reduced motion is never
 * assumed before the browser has actually been asked. */
export function createReducedMotion(): MediaQueryState {
	return createMediaQuery(REDUCED_MOTION_QUERY, false);
}
