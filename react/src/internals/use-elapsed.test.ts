import { createElement, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, it, expect, vi } from "vitest";
import { render, renderHook, cleanup, act } from "@testing-library/react";
import { createElapsed, createNow, formatElapsed, useElapsed, useNow } from "./use-elapsed.js";

const T0 = new Date("2026-01-01T00:00:00.000Z").getTime();

describe("formatElapsed", () => {
	const cases: Array<[ms: number, expected: string]> = [
		[0, "0s"],
		[999, "0s"],
		[1000, "1s"],
		[42_000, "42s"],
		[59_999, "59s"],
		[60_000, "1m 00s"],
		[65_000, "1m 05s"],
		[3_599_000, "59m 59s"],
		[3_600_000, "1h 00m"],
		[3_780_000, "1h 03m"],
		[-5000, "0s"],
		[Number.NaN, "0s"],
	];

	it.each(cases)("formats %i as %s", (ms, expected) => {
		expect(formatElapsed(ms)).toBe(expected);
	});
});

describe("createElapsed", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("schedules nothing until start is called", () => {
		vi.useFakeTimers();
		vi.setSystemTime(T0);
		const elapsed = createElapsed();

		expect(vi.getTimerCount()).toBe(0);
		expect(elapsed.ms).toBe(0);
		expect(elapsed.text).toBe("0s");
		expect(elapsed.running).toBe(false);
	});

	it("reads the wall clock on each tick instead of accumulating", () => {
		vi.useFakeTimers();
		vi.setSystemTime(T0);
		const elapsed = createElapsed({ tickMs: 1000 });
		elapsed.start();
		expect(elapsed.ms).toBe(0);

		// A backgrounded tab: the wall clock moves 10s while pending timers are
		// pushed along with it, so exactly one tick fires afterwards. An
		// accumulating implementation would report 1000 here.
		vi.setSystemTime(T0 + 10_000);
		vi.advanceTimersByTime(1000);

		expect(elapsed.ms).toBe(11_000);
		expect(elapsed.text).toBe("11s");
		expect(elapsed.running).toBe(true);
	});

	it("backdates from a start timestamp in the past, before any tick fires", () => {
		vi.useFakeTimers();
		vi.setSystemTime(T0);
		const elapsed = createElapsed({ tickMs: 1000 });

		elapsed.start(T0 - 65_000);
		expect(elapsed.ms).toBe(65_000);
		expect(elapsed.text).toBe("1m 05s");

		vi.advanceTimersByTime(1000);
		expect(elapsed.ms).toBe(66_000);
	});

	it("stops updating after stop and clears its interval", () => {
		vi.useFakeTimers();
		vi.setSystemTime(T0);
		const elapsed = createElapsed({ tickMs: 1000 });
		elapsed.start();
		vi.advanceTimersByTime(3000);
		expect(elapsed.ms).toBe(3000);

		elapsed.stop();
		expect(elapsed.running).toBe(false);
		expect(vi.getTimerCount()).toBe(0);

		vi.advanceTimersByTime(10_000);
		expect(elapsed.ms).toBe(3000);
	});

	it("returns a stop function usable as effect cleanup", () => {
		vi.useFakeTimers();
		vi.setSystemTime(T0);
		const elapsed = createElapsed({ tickMs: 1000 });
		const stop = elapsed.start();
		vi.advanceTimersByTime(2000);

		stop();
		expect(elapsed.running).toBe(false);
		vi.advanceTimersByTime(10_000);
		expect(elapsed.ms).toBe(2000);
	});

	it("restarts cleanly without leaking the previous interval", () => {
		vi.useFakeTimers();
		vi.setSystemTime(T0);
		const elapsed = createElapsed({ tickMs: 1000 });
		elapsed.start();
		vi.advanceTimersByTime(5000);
		expect(elapsed.ms).toBe(5000);

		elapsed.start(Date.now());
		expect(vi.getTimerCount()).toBe(1);
		expect(elapsed.ms).toBe(0);

		vi.advanceTimersByTime(1000);
		expect(elapsed.ms).toBe(1000);
	});
});

describe("createNow", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("holds the construction time and schedules nothing until start", () => {
		vi.useFakeTimers();
		vi.setSystemTime(T0);
		const now = createNow(30_000);

		expect(now.value).toBe(T0);
		expect(vi.getTimerCount()).toBe(0);

		vi.advanceTimersByTime(60_000);
		expect(now.value).toBe(T0);
	});

	it("refreshes on each tick and stops via the returned function", () => {
		vi.useFakeTimers();
		vi.setSystemTime(T0);
		const now = createNow(30_000);
		const stop = now.start();

		vi.advanceTimersByTime(30_000);
		expect(now.value).toBe(T0 + 30_000);

		stop();
		expect(vi.getTimerCount()).toBe(0);
		vi.advanceTimersByTime(60_000);
		expect(now.value).toBe(T0 + 30_000);
	});
});

/*
 * Hook layer. `useElapsed` subscribes a per-instance `createElapsed` through
 * `useSyncExternalStore`; `useNow` shares one module-scope `createNow`
 * across every mounted consumer.
 */

describe("useElapsed", () => {
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("renders at rest until start is called", () => {
		vi.useFakeTimers();
		vi.setSystemTime(T0);
		const { result } = renderHook(() => useElapsed({ tickMs: 1000 }));

		expect(result.current.ms).toBe(0);
		expect(result.current.text).toBe("0s");
		expect(result.current.running).toBe(false);
	});

	it("re-renders on each tick with the wall-clock-derived value", () => {
		vi.useFakeTimers();
		vi.setSystemTime(T0);
		const { result } = renderHook(() => useElapsed({ tickMs: 1000 }));

		act(() => {
			result.current.start();
		});
		expect(result.current.running).toBe(true);

		act(() => {
			vi.advanceTimersByTime(3000);
		});
		expect(result.current.ms).toBe(3000);
		expect(result.current.text).toBe("3s");
	});

	it("stops ticking, and re-renders, when stop is called", () => {
		vi.useFakeTimers();
		vi.setSystemTime(T0);
		const { result } = renderHook(() => useElapsed({ tickMs: 1000 }));

		act(() => {
			result.current.start();
			vi.advanceTimersByTime(2000);
		});
		act(() => {
			result.current.stop();
		});

		expect(result.current.running).toBe(false);
		const msAtStop = result.current.ms;

		act(() => {
			vi.advanceTimersByTime(5000);
		});
		expect(result.current.ms).toBe(msAtStop);
	});

	it("stops its interval on unmount even if the consumer never called stop", () => {
		vi.useFakeTimers();
		vi.setSystemTime(T0);
		const { result, unmount } = renderHook(() => useElapsed({ tickMs: 1000 }));

		act(() => {
			result.current.start();
		});
		expect(vi.getTimerCount()).toBeGreaterThan(0);

		unmount();
		expect(vi.getTimerCount()).toBe(0);
	});

	it("survives a StrictMode mount/unmount/remount with no leaked interval", () => {
		vi.useFakeTimers();
		vi.setSystemTime(T0);
		function Probe() {
			const elapsed = useElapsed({ tickMs: 1000 });
			return createElement("span", null, elapsed.text);
		}

		const { unmount } = render(createElement(StrictMode, null, createElement(Probe)));
		unmount();

		expect(vi.getTimerCount()).toBe(0);
	});

	/*
	 * `createElapsed` seeds itself from the wall clock when `since` is given,
	 * and the hook builds it during the render. On the server that samples the
	 * SERVER's clock; the hydration render re-runs the same factory against
	 * the client's, however much later the HTML arrived. Two different
	 * numbers, one piece of markup — the mismatch §7 forbids outright.
	 */
	it("hydrates a past `since` without disagreeing with the server render", () => {
		vi.useFakeTimers();
		vi.setSystemTime(T0);
		const since = T0 - 5000;

		function Probe() {
			const elapsed = useElapsed({ since, tickMs: 1000 });
			return createElement("span", null, elapsed.text);
		}

		const html = renderToString(createElement(Probe));
		// The deterministic seed, not the five seconds the server's own clock
		// happened to measure.
		expect(html).toContain(">0s<");

		// The page took four seconds to reach the browser.
		vi.setSystemTime(T0 + 4000);
		const container = document.createElement("div");
		container.innerHTML = html;
		document.body.appendChild(container);

		const recoverable: unknown[] = [];
		const consoleErrors: unknown[][] = [];
		const spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
			consoleErrors.push(args);
		});

		let root: ReturnType<typeof hydrateRoot> | undefined;
		act(() => {
			root = hydrateRoot(container, createElement(Probe), {
				onRecoverableError: (error) => {
					recoverable.push(error);
				},
			});
		});
		spy.mockRestore();

		expect(recoverable).toEqual([]);
		expect(consoleErrors).toEqual([]);
		// And the real duration is on screen once hydration is through: the
		// seed is a starting point, not the answer.
		expect(container.textContent).toBe("9s");

		act(() => {
			root?.unmount();
		});
		container.remove();
	});
});

describe("useNow", () => {
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("returns the current time and refreshes on the shared interval", () => {
		vi.useFakeTimers();
		vi.setSystemTime(T0);
		const { result } = renderHook(() => useNow(1000));
		expect(result.current).toBe(T0);

		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(result.current).toBe(T0 + 1000);
	});

	it("shares one interval across every mounted consumer", () => {
		vi.useFakeTimers();
		vi.setSystemTime(T0);
		const a = renderHook(() => useNow(1000));
		const b = renderHook(() => useNow(1000));

		const timersAfterBoth = vi.getTimerCount();

		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(a.result.current).toBe(T0 + 1000);
		expect(b.result.current).toBe(T0 + 1000);

		a.unmount();
		// One consumer left: the shared interval keeps running for it.
		expect(vi.getTimerCount()).toBe(timersAfterBoth);

		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(b.result.current).toBe(T0 + 2000);

		b.unmount();
		expect(vi.getTimerCount()).toBe(0);
	});

	it("restarts the shared interval when a consumer arrives after the last one left", () => {
		vi.useFakeTimers();
		vi.setSystemTime(T0);
		renderHook(() => useNow(1000)).unmount();
		expect(vi.getTimerCount()).toBe(0);

		vi.setSystemTime(T0 + 5000);
		const { result } = renderHook(() => useNow(1000));
		expect(result.current).toBe(T0 + 5000);

		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(result.current).toBe(T0 + 6000);
	});

	/*
	 * StrictMode (§9.4). The rehearsal runs the retain/release pair twice on
	 * one consumer. The counter has to come back to rest and the clock has to
	 * survive: a release that outlives its own retain would either strand the
	 * interval or leave the next consumer subscribed to a store nothing ever
	 * starts, which reads as a timestamp frozen at construction time forever.
	 */
	it("returns the shared interval to rest after a StrictMode rehearsal", () => {
		vi.useFakeTimers();
		vi.setSystemTime(T0);
		function Probe() {
			return createElement("span", null, String(useNow(1000)));
		}

		const { unmount } = render(createElement(StrictMode, null, createElement(Probe)));
		expect(vi.getTimerCount()).toBe(1);

		unmount();
		expect(vi.getTimerCount()).toBe(0);
	});

	it("keeps ticking for a consumer mounted after a StrictMode consumer", () => {
		vi.useFakeTimers();
		vi.setSystemTime(T0);
		const strict = renderHook(() => useNow(1000), { wrapper: StrictMode });
		const plain = renderHook(() => useNow(1000));

		expect(vi.getTimerCount()).toBe(1);
		expect(plain.result.current).toBe(T0);

		act(() => {
			vi.advanceTimersByTime(3000);
		});
		expect(strict.result.current).toBe(T0 + 3000);
		expect(plain.result.current).toBe(T0 + 3000);

		strict.unmount();
		plain.unmount();
		expect(vi.getTimerCount()).toBe(0);
	});

	it("keeps ticking for a consumer mounted after a StrictMode consumer unmounted", () => {
		vi.useFakeTimers();
		vi.setSystemTime(T0);
		renderHook(() => useNow(1000), { wrapper: StrictMode }).unmount();
		expect(vi.getTimerCount()).toBe(0);

		const { result } = renderHook(() => useNow(1000));
		expect(result.current).toBe(T0);

		act(() => {
			vi.advanceTimersByTime(3000);
		});
		expect(result.current).toBe(T0 + 3000);
	});
});
