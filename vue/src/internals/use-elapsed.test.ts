import { render, cleanup } from "@testing-library/vue";
import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useElapsed, useNow } from "./use-elapsed.js";
import type { ElapsedOptions, ElapsedState, NowState } from "./elapsed.js";

const T0 = new Date("2026-01-01T00:00:00.000Z").getTime();

/** Mounts a composable in a real component scope and hands the state back. */
function mount<T>(run: () => T) {
	let state!: T;
	const Harness = defineComponent({
		setup() {
			state = run();
			return () => h("div");
		},
	});
	const { unmount } = render(Harness);
	return { state, unmount };
}

const mountElapsed = (opts?: ElapsedOptions) =>
	mount<ElapsedState>(() => useElapsed(opts ?? {}));

describe("useElapsed", () => {
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("starts on mount and ticks off the wall clock, not an accumulator", () => {
		vi.useFakeTimers();
		vi.setSystemTime(T0);
		const { state } = mountElapsed({ tickMs: 1000 });

		expect(state.running).toBe(true);
		expect(state.ms).toBe(0);

		// A backgrounded tab: the clock jumps 10s while one pending tick fires.
		vi.setSystemTime(T0 + 10_000);
		vi.advanceTimersByTime(1000);
		expect(state.ms).toBe(11_000);
		expect(state.text).toBe("11s");
	});

	it("releases the interval when the scope ends", () => {
		vi.useFakeTimers();
		vi.setSystemTime(T0);
		const { state, unmount } = mountElapsed({ tickMs: 1000 });
		expect(vi.getTimerCount()).toBe(1);

		unmount();
		expect(state.running).toBe(false);
		expect(vi.getTimerCount()).toBe(0);
	});

	/*
	 * D-V20, second site. `createElapsed` runs inside `setup()`, which is a
	 * render path and runs on the server and again at hydration, so a
	 * `Date.now()` seed would emit a duration the client cannot reproduce.
	 */
	describe("pre-start sentinel (D-V20)", () => {
		it("holds NaN / empty text with a backdated `since` until mount", () => {
			vi.useFakeTimers();
			vi.setSystemTime(T0);
			const { state } = mountElapsed({ since: T0 - 65_000, tickMs: 1000 });

			// Mounted, so `start()` has run and the real reading is in.
			expect(state.ms).toBe(65_000);
			expect(state.text).toBe("1m 05s");
		});

		it("renders the sentinel as nothing on the server, never a duration", async () => {
			const now = vi.spyOn(Date, "now");
			const Probe = defineComponent({
				setup() {
					const elapsed = useElapsed({ since: T0 - 65_000 });
					return () => h("span", elapsed.text);
				},
			});

			const html = await renderToString(createSSRApp(Probe));

			// The load-bearing assertion: no wall clock is read on a render path.
			expect(now).not.toHaveBeenCalled();
			// And so nothing measured reaches the markup — an empty span, not "1m 05s".
			expect(html).not.toMatch(/\d+[smh]/);
			expect(html).toBe("<span></span>");
			now.mockRestore();
		});

		it("falls back to the source's 0 / \"0s\" when there is no `since` to measure", async () => {
			const now = vi.spyOn(Date, "now");
			const Probe = defineComponent({
				setup() {
					const elapsed = useElapsed();
					return () => h("span", elapsed.text);
				},
			});

			const html = await renderToString(createSSRApp(Probe));

			expect(now).not.toHaveBeenCalled();
			expect(html).toBe("<span>0s</span>");
			now.mockRestore();
		});
	});
});

describe("useNow", () => {
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("fills in the clock on mount and refreshes on each tick", () => {
		vi.useFakeTimers();
		vi.setSystemTime(T0);
		const { state } = mount<NowState>(() => useNow(30_000));

		expect(state.value).toBe(T0);
		vi.advanceTimersByTime(30_000);
		expect(state.value).toBe(T0 + 30_000);
	});

	it("releases the shared interval when the scope ends", () => {
		vi.useFakeTimers();
		vi.setSystemTime(T0);
		const { unmount } = mount<NowState>(() => useNow(30_000));
		expect(vi.getTimerCount()).toBe(1);

		unmount();
		expect(vi.getTimerCount()).toBe(0);
	});

	it("keeps the NaN sentinel through a server render, reading no clock", async () => {
		const now = vi.spyOn(Date, "now");
		const Probe = defineComponent({
			setup() {
				const clock = useNow();
				return () => h("span", Number.isFinite(clock.value) ? String(clock.value) : "");
			},
		});

		const html = await renderToString(createSSRApp(Probe));

		expect(now).not.toHaveBeenCalled();
		expect(html).toBe("<span></span>");
		now.mockRestore();
	});
});
