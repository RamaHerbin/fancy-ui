import { afterEach, describe, expect, it, vi } from "vitest";
import {
	createMediaQuery,
	createReducedMotion,
	REDUCED_MOTION_QUERY,
} from "./media-query.svelte.js";

/** Installs a fake `window.matchMedia` and hands back the registered
 * change handler so a test can simulate a live preference flip, exactly
 * like `RecommendationCard.test.ts`'s override pattern. */
function stubMatchMedia(matches: boolean) {
	let handler: ((event: MediaQueryListEvent) => void) | undefined;
	const addEventListener = vi.fn((_type: string, h: (event: MediaQueryListEvent) => void) => {
		handler = h;
	});
	// Actually clears the registered handler (matching real EventTarget
	// semantics) rather than just recording the call — a fireChange() after
	// stop() must not reach it, or "stop() removes the listener" would be
	// unfalsifiable.
	const removeEventListener = vi.fn((_type: string, h: (event: MediaQueryListEvent) => void) => {
		if (handler === h) handler = undefined;
	});
	// A live getter, not a plain field: `MediaQueryList.matches` is
	// read-only from the outside in the real API too (only the browser
	// updates it) — `currentMatches` is the mutable half `fireChange` below
	// actually writes to.
	let currentMatches = matches;
	const mql = {
		get matches() {
			return currentMatches;
		},
		media: "",
		onchange: null,
		addEventListener,
		removeEventListener,
		addListener: () => {},
		removeListener: () => {},
		dispatchEvent: () => false,
	} as unknown as MediaQueryList;

	const matchMedia = vi.fn(() => mql);
	Object.defineProperty(window, "matchMedia", {
		value: matchMedia,
		writable: true,
		configurable: true,
	});

	return {
		matchMedia,
		removeEventListener,
		fireChange(next: boolean) {
			currentMatches = next;
			handler?.({ matches: next } as MediaQueryListEvent);
		},
	};
}

/** Restores the same no-op default `src/test-setup.ts` installs, so a
 * stub from one test never leaks its mock into the next. */
function resetMatchMedia() {
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		configurable: true,
		value: (query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => false,
			addListener: () => {},
			removeListener: () => {},
		}),
	});
}

describe("createMediaQuery", () => {
	afterEach(resetMatchMedia);

	it("does not touch matchMedia until start() is called", () => {
		const stub = stubMatchMedia(false);
		createMediaQuery("(min-width: 1px)");
		expect(stub.matchMedia).not.toHaveBeenCalled();
	});

	it("start() reads mql.matches into current", () => {
		stubMatchMedia(true);
		const mq = createMediaQuery("(min-width: 1px)");
		mq.start();
		expect(mq.current).toBe(true);
	});

	it("a dispatched change event updates current", () => {
		const stub = stubMatchMedia(false);
		const mq = createMediaQuery("(min-width: 1px)");
		mq.start();
		expect(mq.current).toBe(false);

		stub.fireChange(true);
		expect(mq.current).toBe(true);
	});

	it("stop() removes the change listener and current stops tracking", () => {
		const stub = stubMatchMedia(false);
		const mq = createMediaQuery("(min-width: 1px)");
		mq.start();
		mq.stop();

		expect(stub.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));

		stub.fireChange(true);
		expect(mq.current).toBe(false);
	});

	it("start() returns its own stop function, usable directly as $effect cleanup", () => {
		const stub = stubMatchMedia(false);
		const mq = createMediaQuery("(min-width: 1px)");
		const stop = mq.start();
		stop();
		expect(stub.removeEventListener).toHaveBeenCalledTimes(1);
	});

	it("SSR / no matchMedia: current stays at the fallback and start() never throws", () => {
		Object.defineProperty(window, "matchMedia", {
			value: undefined,
			writable: true,
			configurable: true,
		});
		const mq = createMediaQuery("(min-width: 1px)", true);
		expect(() => mq.start()).not.toThrow();
		expect(mq.current).toBe(true);
	});

	it("calls window.matchMedia FRESH inside start() every time — a later override still lands", () => {
		const mq = createMediaQuery("(min-width: 1px)");

		stubMatchMedia(false);
		mq.start();
		expect(mq.current).toBe(false);

		// Swap window.matchMedia wholesale after the factory already exists —
		// this only reads the new implementation if createMediaQuery never
		// cached the old matchMedia function reference or MediaQueryList.
		stubMatchMedia(true);
		mq.start();
		expect(mq.current).toBe(true);
	});

	it("returns a frozen object — start/stop cannot be reassigned out from under a consumer", () => {
		const mq = createMediaQuery("(min-width: 1px)");
		expect(Object.isFrozen(mq)).toBe(true);
		// Cast away the interface's own typing (its `start()`/`stop()` method
		// shorthand isn't marked `readonly` at the type level) to prove the
		// RUNTIME freeze specifically — strict-mode assignment to a frozen
		// object's property throws, regardless of what the type permits.
		const mutable = mq as unknown as { start: unknown };
		expect(() => {
			mutable.start = () => () => {};
		}).toThrow(TypeError);
	});

	it("stop() leaves current at its last observed value rather than resetting to fallback", () => {
		const stub = stubMatchMedia(true);
		const mq = createMediaQuery("(min-width: 1px)", false);
		mq.start();
		expect(mq.current).toBe(true);

		mq.stop();
		expect(mq.current).toBe(true); // NOT back to the `false` fallback

		stub.fireChange(false); // and stays put — the listener really is gone
		expect(mq.current).toBe(true);
	});

	it("restarting calls stop() first — never leaves two listeners racing each other", () => {
		const stub = stubMatchMedia(false);
		const mq = createMediaQuery("(min-width: 1px)");
		mq.start();
		mq.start();

		stub.fireChange(true);
		expect(mq.current).toBe(true);
		expect(stub.removeEventListener).toHaveBeenCalledTimes(1);
	});
});

describe("createReducedMotion", () => {
	afterEach(resetMatchMedia);

	it("queries REDUCED_MOTION_QUERY with fallback false", () => {
		const stub = stubMatchMedia(false);
		const mq = createReducedMotion();
		mq.start();

		expect(stub.matchMedia).toHaveBeenCalledWith(REDUCED_MOTION_QUERY);
		expect(mq.current).toBe(false);
	});

	it("reflects matches: true when the browser reports the preference", () => {
		stubMatchMedia(true);
		const mq = createReducedMotion();
		mq.start();
		expect(mq.current).toBe(true);
	});
});
