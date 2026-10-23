import { describe, expect, it } from "vitest";
import { createCompareProbe } from "./compare-hdr.js";

const palette: [string, string, string] = ["#f0f", "#fff", "#0ff"];

describe("compare-hdr", () => {
	it("puts a full-height core on the seam, flanked by the two fringes", () => {
		const probe = createCompareProbe(() => ({ percent: 25, energy: 0, trail: 0, palette }));
		const lights = probe({ width: 400, height: 300, now: 0, peak: 4.9 });
		expect(lights).toHaveLength(3);
		expect(lights[0]).toMatchObject({ x0: 100, x1: 100, y0: 0, y1: 300, color: "#fff" });
		expect(lights[1]!.x0).toBeLessThan(100);
		expect(lights[2]!.x0).toBeGreaterThan(100);
	});

	it("climbs to the peak at full energy and adds the speed wash", () => {
		const probe = createCompareProbe(() => ({ percent: 50, energy: 1, trail: 40, palette }));
		const lights = probe({ width: 400, height: 300, now: 0, peak: 4.9 });
		expect(lights[0]!.intensity).toBeCloseTo(4.9, 5);
		expect(lights).toHaveLength(4);
		expect(lights[3]!.x0).toBe(200 - 20);
	});
});
