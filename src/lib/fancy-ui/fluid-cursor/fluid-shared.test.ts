import { describe, it, expect } from "vitest";
import { scaleRadiusForContainer, correctRadius, getSimResolution } from "./fluid-shared.js";

describe("scaleRadiusForContainer", () => {
	it("keeps the radius unchanged at viewport size (fullscreen)", () => {
		expect(scaleRadiusForContainer(0.002, 900, 900)).toBe(0.002);
	});

	it("keeps the radius unchanged when the container is larger than the viewport", () => {
		expect(scaleRadiusForContainer(0.002, 1800, 900)).toBe(0.002);
	});

	it("scales quadratically so the apparent size matches viewport size", () => {
		// Container 4x smaller than viewport: characteristic length must be
		// 4x larger in container fractions, i.e. radius x16.
		expect(scaleRadiusForContainer(0.002, 250, 1000)).toBeCloseTo(0.032, 10);
	});

	it("caps the radius so a splat stays under ~30% of a tiny container", () => {
		expect(scaleRadiusForContainer(0.002, 50, 1000)).toBe(0.09);
	});

	it("is defensive about degenerate dimensions", () => {
		expect(scaleRadiusForContainer(0.002, 0, 1000)).toBe(0.002);
		expect(scaleRadiusForContainer(0.002, 250, 0)).toBe(0.002);
	});
});

describe("correctRadius", () => {
	it("stretches the radius by aspect ratio on landscape canvases", () => {
		expect(correctRadius(0.01, 200, 100)).toBe(0.02);
	});

	it("leaves portrait canvases unchanged", () => {
		expect(correctRadius(0.01, 100, 200)).toBe(0.01);
	});
});

describe("getSimResolution", () => {
	it("puts the larger grid dimension along the larger canvas axis", () => {
		expect(getSimResolution(128, 1000, 500)).toEqual({ width: 256, height: 128 });
		expect(getSimResolution(128, 500, 1000)).toEqual({ width: 128, height: 256 });
	});
});
