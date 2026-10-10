import { describe, it, expect } from "vitest";
import {
	scaleRadiusForContainer,
	correctRadius,
	getSimResolution,
	clickBoost,
	CLICK_PEAK,
} from "./fluid-shared.js";

describe("scaleRadiusForContainer", () => {
	it("keeps the radius unchanged at viewport size (fullscreen)", () => {
		expect(scaleRadiusForContainer(0.002, 900, 900)).toBe(0.002);
	});

	it("keeps the radius unchanged when the container is larger than the viewport", () => {
		expect(scaleRadiusForContainer(0.002, 1800, 900)).toBe(0.002);
	});

	it("grows the radius linearly with the viewport/container ratio (sqrt(k) in apparent size)", () => {
		// Container 4x smaller than viewport: radius x4, characteristic
		// length x2 in container fractions.
		expect(scaleRadiusForContainer(0.002, 250, 1000)).toBeCloseTo(0.008, 10);
	});

	it("caps the radius so a splat stays under ~30% of a tiny container", () => {
		expect(scaleRadiusForContainer(0.01, 50, 1000)).toBe(0.09);
	});

	it("never shrinks a caller-provided radius already above the cap", () => {
		expect(scaleRadiusForContainer(0.2, 250, 1000)).toBe(0.2);
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

describe("clickBoost", () => {
	it("keeps the historical ×10 at the default intensity and below", () => {
		expect(clickBoost(0.15)).toBe(10);
		expect(clickBoost(0.05)).toBe(10);
	});

	it("lands a click on CLICK_PEAK once the intensity is raised", () => {
		expect(clickBoost(0.6)).toBeCloseTo(2.5);
		expect(clickBoost(1)).toBe(1.5);
		expect(0.6 * clickBoost(0.6)).toBeCloseTo(CLICK_PEAK);
	});

	it("deposits nothing for a zero or invalid intensity", () => {
		expect(clickBoost(0)).toBe(0);
		expect(clickBoost(-1)).toBe(0);
		expect(clickBoost(Number.NaN)).toBe(0);
	});
});
