// @vitest-environment node
//
// D-V20, server half: `createNow` seeds `NaN` rather than `Date.now()`, so a
// server render carries "not yet known" instead of a timestamp the client
// cannot reproduce. The sentinel is not conditional on the environment — the
// browser half of the same window (the hydration render, a fresh client tree)
// is pinned from jsdom in `elapsed.test.ts`. This file exists to prove the
// module is safe to import and construct with no browser global in scope at
// all. Not transposed from Svelte: the rune source has no such sentinel, this
// divergence exists only in this package.
import { describe, expect, it } from "vitest";
import { createNow } from "./elapsed.js";

describe("createNow (no window)", () => {
	it("seeds the NaN sentinel instead of a real server timestamp", () => {
		expect(typeof window).toBe("undefined");
		const now = createNow();
		expect(Number.isNaN(now.value)).toBe(true);
	});

	it("schedules nothing at construction time", () => {
		const now = createNow();
		expect(Number.isNaN(now.value)).toBe(true);
		now.stop();
	});

	it("fills in a real timestamp once start() runs, even off the client", () => {
		const now = createNow(30_000);
		const stop = now.start();
		expect(Number.isFinite(now.value)).toBe(true);
		stop();
	});
});
