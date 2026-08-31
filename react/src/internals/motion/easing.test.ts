import { describe, expect, it } from "vitest";
import { expoIn, expoOut, linear } from "./easing.js";

// Pinned against literal expected values (not against the framework's easing
// module — inlining these curves is exactly the point, divergence D-7). The
// endpoint guards are what make 0 and 1 exact rather than 2**-10 off.
describe("expoIn", () => {
	it("pins the curve at 0, 0.25, 0.5, 0.75, 1", () => {
		expect(expoIn(0)).toBe(0);
		expect(expoIn(0.25)).toBe(0.005524271728019903); // 2 ** -7.5
		expect(expoIn(0.5)).toBe(0.03125); // 2 ** -5
		expect(expoIn(0.75)).toBe(0.1767766952966369); // 2 ** -2.5
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
		expect(expoOut(0.25)).toBe(0.8232233047033631); // 1 - 2 ** -2.5
		expect(expoOut(0.5)).toBe(0.96875); // 1 - 2 ** -5
		expect(expoOut(0.75)).toBe(0.99447572827198); // 1 - 2 ** -7.5
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
