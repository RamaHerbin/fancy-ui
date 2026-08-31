// @vitest-environment node
/**
 * Server-side contract for the shared clock.
 *
 * Runs in the `node` environment — no `window`, no `document`, no effects —
 * which is exactly the pass that decides what the server HTML says about
 * every relative timestamp on the page. `useNow` cannot hand back a real
 * `Date.now()` here: the hydration render on the client would have to
 * reproduce the server's timestamp to agree with it, and it cannot. It
 * returns the `NaN` sentinel instead, and `formatRelativeTime` turns that
 * into an empty label — never into one measured against the epoch, which
 * reads "in 57 years" for any present-day timestamp.
 *
 * The import is dynamic and preceded by `vi.resetModules()` so the shared
 * module-scope clock is evaluated inside the test run, with the node globals
 * in place.
 */
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { formatRelativeTime } from "./relative-time.js";

let mod: typeof import("./use-elapsed.js");

beforeAll(async () => {
	vi.resetModules();
	mod = await import("./use-elapsed.js");
});

describe("useNow on the server", () => {
	it("really is a DOM-less environment", () => {
		expect(typeof window).toBe("undefined");
		expect(typeof document).toBe("undefined");
	});

	it("renders the not-started sentinel rather than a wall-clock value", () => {
		let seen: number | null = null;
		function Probe() {
			seen = mod.useNow(1000);
			return null;
		}

		renderToString(createElement(Probe));
		expect(seen).not.toBeNull();
		expect(Number.isNaN(seen as unknown as number)).toBe(true);
	});

	it("emits an empty relative label instead of a half-century-off one", () => {
		const timestamp = Date.now() - 5 * 60 * 1000;

		function Row() {
			const now = mod.useNow(1000);
			return createElement(
				"time",
				{ dateTime: new Date(timestamp).toISOString() },
				formatRelativeTime(timestamp, { locale: "en", now })
			);
		}

		const html = renderToString(createElement(Row));
		expect(html).not.toMatch(/year/);
		expect(html).toMatch(/^<time [^>]*><\/time>$/);
	});

	it("starts no interval on the server", () => {
		vi.useFakeTimers();
		const timers = vi.getTimerCount();
		renderToString(
			createElement(function Probe() {
				mod.useNow(1000);
				return null;
			})
		);
		expect(vi.getTimerCount()).toBe(timers);
		vi.useRealTimers();
	});
});

/*
 * The stopwatch has the same hazard for the same reason. `createElapsed`
 * seeds itself with `Date.now() - since` so a caller-supplied start time
 * paints its real duration straight away, and the hook builds the store
 * during the render — so the server samples the SERVER's clock and the
 * hydration render samples the client's, some transport time later. Those
 * two numbers cannot be made to agree, so the server render publishes a
 * deterministic zero instead and the live duration arrives in the layout
 * phase of hydration, before the first paint.
 */
describe("useElapsed on the server", () => {
	it("renders the deterministic seed for a `since` in the past, not the server's own measurement", () => {
		const since = Date.now() - 5 * 60 * 1000;
		let seen: number | null = null;

		function Stopwatch() {
			const elapsed = mod.useElapsed({ since });
			seen = elapsed.ms;
			return createElement("span", null, elapsed.text);
		}

		const html = renderToString(createElement(Stopwatch));
		expect(seen).toBe(0);
		// Not "5m 00s", which is what the server's clock measured and what no
		// client could reproduce.
		expect(html).toBe("<span>0s</span>");
	});

	it("reports a stopwatch nobody has started as not running", () => {
		let running: boolean | null = null;
		renderToString(
			createElement(function Probe() {
				running = mod.useElapsed({ since: Date.now() - 1000 }).running;
				return null;
			})
		);
		expect(running).toBe(false);
	});

	it("starts no interval on the server", () => {
		vi.useFakeTimers();
		const timers = vi.getTimerCount();
		renderToString(
			createElement(function Probe() {
				mod.useElapsed({ since: Date.now() - 1000, tickMs: 1000 });
				return null;
			})
		);
		expect(vi.getTimerCount()).toBe(timers);
		vi.useRealTimers();
	});
});
