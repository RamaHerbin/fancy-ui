import { describe, expect, it } from "vitest";
import { DURATIONS, EASINGS, JS_EASINGS, STAGGER_CAPS, STAGGERS } from "./tokens.js";

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

	it("STAGGERS and STAGGER_CAPS match the frozen values (ms)", () => {
		expect(STAGGERS).toEqual({ char: 15, charBlur: 20, word: 40, line: 150, item: 50 });
		expect(STAGGER_CAPS).toEqual({ text: 200, item: 600 });
	});

	it("JS_EASINGS exposes only out/in — overshoot has no JS-timed consumer", () => {
		expect(Object.keys(JS_EASINGS).sort()).toEqual(["in", "out"]);
	});

	it("JS_EASINGS.out/in are svelte/easing's expoOut/expoIn (boundary sanity, not curve-shape testing)", () => {
		expect(JS_EASINGS.out(0)).toBe(0);
		expect(JS_EASINGS.out(1)).toBe(1);
		expect(JS_EASINGS.in(0)).toBe(0);
		expect(JS_EASINGS.in(1)).toBe(1);
	});
});
