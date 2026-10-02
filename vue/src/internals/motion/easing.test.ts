import { describe, expect, it } from "vitest";
import { expoIn, expoOut, linear } from "./easing.js";

// Pinned against expected values (not against the framework's easing module —
// inlining these curves is exactly the point, divergence D-7). The endpoint
// guards are what make 0 and 1 exact rather than 2**-10 off. Exactly
// representable points (0, 2**-5, 1) pin to literals; the irrational points
// pin to the same formula evaluated on the host — `**` is spec-identical to
// Math.pow, and macOS vs Linux libm round the last ULP of 2**-7.5 differently,
// so a literal from one platform fails CI on the other.
describe("expoIn", () => {
	it("pins the curve at 0, 0.25, 0.5, 0.75, 1", () => {
		expect(expoIn(0)).toBe(0);
		expect(expoIn(0.25)).toBe(2 ** (10 * (0.25 - 1))); // 2 ** -7.5
		expect(expoIn(0.5)).toBe(0.03125); // 2 ** -5
		expect(expoIn(0.75)).toBe(2 ** (10 * (0.75 - 1))); // 2 ** -2.5
		expect(expoIn(1)).toBe(1);
	});

	it("is monotonically increasing across the sampled range", () => {
		const samples = [0, 0.25, 0.5, 0.75, 1].map(expoIn);
		for (let i = 1; i < samples.length; i++) {
			expect(samples[i]).toBeGreaterThan(samples[i - 1] as number);
		}
	});
});

describe("expoOut", () => {
	it("pins the curve at 0, 0.25, 0.5, 0.75, 1", () => {
		expect(expoOut(0)).toBe(0);
		expect(expoOut(0.25)).toBe(1 - 2 ** (-10 * 0.25)); // 1 - 2 ** -2.5
		expect(expoOut(0.5)).toBe(0.96875); // 1 - 2 ** -5
		expect(expoOut(0.75)).toBe(1 - 2 ** (-10 * 0.75)); // 1 - 2 ** -7.5
		expect(expoOut(1)).toBe(1);
	});

	it("is monotonically increasing across the sampled range", () => {
		const samples = [0, 0.25, 0.5, 0.75, 1].map(expoOut);
		for (let i = 1; i < samples.length; i++) {
			expect(samples[i]).toBeGreaterThan(samples[i - 1] as number);
		}
	});
});

describe("linear", () => {
	it("is the identity curve", () => {
		expect([0, 0.25, 0.5, 0.75, 1].map(linear)).toEqual([0, 0.25, 0.5, 0.75, 1]);
	});
});
