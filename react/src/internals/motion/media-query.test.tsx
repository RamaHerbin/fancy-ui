import { act, renderHook } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { REDUCED_MOTION_QUERY, useMediaQuery, useReducedMotion } from "./media-query.js";

// Shape 4 (hook). The Svelte suite drove `createMediaQuery`'s factory directly;
// its `start()`/`stop()` pair has no counterpart here (D-4), so the assertions
// that only described that lifecycle — "does not touch matchMedia until
// start()", "start() returns its own stop function", "stop() leaves current at
// its last observed value", "restarting calls stop() first", "returns a frozen
// object" — are dropped along with it. Everything that described OBSERVABLE
// behaviour transposes.

/** Installs a fake `window.matchMedia` and hands back the registered change
 * handler so a test can simulate a live preference flip. */
function stubMatchMedia(matches: boolean) {
	let handler: ((event: MediaQueryListEvent) => void) | undefined;
	const addEventListener = vi.fn((_type: string, h: (event: MediaQueryListEvent) => void) => {
		handler = h;
	});
	// Actually clears the registered handler (matching real EventTarget
	// semantics) rather than just recording the call — a fireChange() after
	// unmount must not reach it, or "unmount removes the listener" would be
	// unfalsifiable.
	const removeEventListener = vi.fn((_type: string, h: (event: MediaQueryListEvent) => void) => {
		if (handler === h) handler = undefined;
	});
	// A live getter, not a plain field: `MediaQueryList.matches` is read-only
	// from the outside in the real API too (only the browser updates it) —
	// `currentMatches` is the mutable half `fireChange` below actually writes.
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

/** Restores the same no-op default `src/test-setup.ts` installs, so a stub from
 * one test never leaks its mock into the next. */
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

describe("useMediaQuery", () => {
	afterEach(resetMatchMedia);

	it("reads mql.matches on the first render", () => {
		stubMatchMedia(true);
		const { result } = renderHook(() => useMediaQuery("(min-width: 1px)"));
		expect(result.current).toBe(true);
	});

	it("a dispatched change event updates the returned value", () => {
		const stub = stubMatchMedia(false);
		const { result } = renderHook(() => useMediaQuery("(min-width: 1px)"));
		expect(result.current).toBe(false);

		act(() => stub.fireChange(true));
		expect(result.current).toBe(true);
	});

	it("unmount removes the change listener and the value stops tracking", () => {
		const stub = stubMatchMedia(false);
		const { result, unmount } = renderHook(() => useMediaQuery("(min-width: 1px)"));
		unmount();

		expect(stub.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));

		stub.fireChange(true);
		expect(result.current).toBe(false);
	});

	it("subscribes with the query it was given", () => {
		const stub = stubMatchMedia(false);
		renderHook(() => useMediaQuery("(min-width: 640px)"));
		expect(stub.matchMedia).toHaveBeenCalledWith("(min-width: 640px)");
	});

	it("no matchMedia at all: stays at the fallback and never throws", () => {
		Object.defineProperty(window, "matchMedia", {
			value: undefined,
			writable: true,
			configurable: true,
		});

		const { result } = renderHook(() => useMediaQuery("(min-width: 1px)", true));
		expect(result.current).toBe(true);
	});

	it("resolves window.matchMedia FRESH on every read — a later override still lands", () => {
		stubMatchMedia(false);
		const { result, rerender } = renderHook(() => useMediaQuery("(min-width: 1px)"));
		expect(result.current).toBe(false);

		// Swap window.matchMedia wholesale after the hook has already mounted —
		// this only reads the new implementation if nothing cached the old
		// matchMedia function reference or its MediaQueryList.
		stubMatchMedia(true);
		rerender();
		expect(result.current).toBe(true);
	});

	it("re-subscribes when the query changes", () => {
		const stub = stubMatchMedia(false);
		const { rerender } = renderHook(({ query }) => useMediaQuery(query), {
			initialProps: { query: "(min-width: 1px)" },
		});

		rerender({ query: "(min-width: 999px)" });

		expect(stub.removeEventListener).toHaveBeenCalledTimes(1);
		expect(stub.matchMedia).toHaveBeenCalledWith("(min-width: 999px)");
	});
});

describe("useReducedMotion", () => {
	afterEach(resetMatchMedia);

	it("queries REDUCED_MOTION_QUERY with fallback false", () => {
		const stub = stubMatchMedia(false);
		const { result } = renderHook(() => useReducedMotion());

		expect(stub.matchMedia).toHaveBeenCalledWith(REDUCED_MOTION_QUERY);
		expect(result.current).toBe(false);
	});

	it("reflects matches: true when the browser reports the preference", () => {
		stubMatchMedia(true);
		const { result } = renderHook(() => useReducedMotion());
		expect(result.current).toBe(true);
	});
});

describe("hydration", () => {
	afterEach(resetMatchMedia);

	function Probe() {
		const reduced = useReducedMotion();
		return <span data-testid="value">{String(reduced)}</span>;
	}

	it("renders the fallback on the server and hydrates it without a mismatch, even when the query matches", async () => {
		// The server has no matchMedia; the client's says the preference IS set.
		// A lazy `useState(() => matchMedia(...).matches)` would mismatch here —
		// `getServerSnapshot` is what makes this class of bug unreachable.
		const html = renderToString(<Probe />);
		expect(html).toContain("false");

		stubMatchMedia(true);
		const container = document.createElement("div");
		container.innerHTML = html;
		document.body.appendChild(container);

		const errors = vi.spyOn(console, "error").mockImplementation(() => {});
		const root = await act(async () => hydrateRoot(container, <Probe />));

		expect(errors).not.toHaveBeenCalled();
		// The real answer arrives after hydration, in the same commit that
		// subscribes — never during it.
		expect(container.querySelector('[data-testid="value"]')?.textContent).toBe("true");

		errors.mockRestore();
		await act(async () => root.unmount());
		container.remove();
	});
});
