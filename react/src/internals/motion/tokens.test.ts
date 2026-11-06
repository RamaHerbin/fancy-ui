import { describe, expect, it } from "vitest";
import { DURATIONS, EASINGS, HOVER, JS_EASINGS, STAGGER_CAP, STAGGERS } from "./tokens.js";
import { expoIn, expoOut } from "./easing.js";

describe("tokens", () => {
	it("DURATIONS matches the frozen ladder (ms)", () => {
		expect(DURATIONS).toEqual({ micro: 80, fast: 150, base: 300, exit: 200, entrance: 600 });
	});

	it("EASINGS are the frozen cubic-bezier strings", () => {
		expect(EASINGS).toEqual({
			out: "cubic-bezier(0.16, 1, 0.3, 1)",
			in: "cubic-bezier(0.7, 0, 0.84, 0)",
			inout: "cubic-bezier(0.4, 0, 0.2, 1)",
			overshoot: "cubic-bezier(0.34, 1.56, 0.64, 1)",
		});
	});

	it("STAGGERS and STAGGER_CAP match the frozen values (ms / px)", () => {
		expect(STAGGERS).toEqual({ char: 15, charBlur: 20, word: 40, line: 150, item: 50 });
		expect(STAGGER_CAP).toEqual({ floor: 200, ceil: 600, fromPx: 48, toPx: 448 });
	});

	it("HOVER pairs fast/out on the way in and exit/out on the way out — a return never bounces", () => {
		expect(HOVER).toEqual({
			in: { duration: "fast", easing: "out" },
			out: { duration: "exit", easing: "out" },
		});
	});

	it("JS_EASINGS.out decelerates: a quarter of the time covers most of the distance", () => {
		expect(JS_EASINGS.out(0.25)).toBeGreaterThan(0.25);
		expect(JS_EASINGS.in(0.25)).toBeLessThan(0.25);
	});

	it("JS_EASINGS exposes only out/in — overshoot has no JS-timed consumer", () => {
		expect(Object.keys(JS_EASINGS).sort()).toEqual(["in", "out"]);
	});

	it("JS_EASINGS.out/in are easing.ts's expoOut/expoIn (boundary sanity, not curve-shape testing)", () => {
		expect(JS_EASINGS.out).toBe(expoOut);
		expect(JS_EASINGS.in).toBe(expoIn);
		expect(JS_EASINGS.out(0)).toBe(0);
		expect(JS_EASINGS.out(1)).toBe(1);
		expect(JS_EASINGS.in(0)).toBe(0);
		expect(JS_EASINGS.in(1)).toBe(1);
	});
});
