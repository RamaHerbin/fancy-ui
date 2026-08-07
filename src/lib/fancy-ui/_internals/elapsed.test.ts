import { afterEach, describe, it, expect, vi } from "vitest";
import { createElapsed, createNow, formatElapsed } from "./elapsed.svelte.js";

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
