import { describe, expect, it } from "vitest";
import { createCardSpotlightProbe, type CardSpotlightHdrState } from "./card-spotlight-hdr.js";

const base: CardSpotlightHdrState = {
	x: 40,
	y: 30,
	hovering: true,
	size: 200,
	color: "#ff0080",
	opacity: 0.8,
};

describe("card-spotlight-hdr", () => {
	it("fades the light in at the pointer over ~300 ms", () => {
		const state = { ...base };
		const probe = createCardSpotlightProbe(() => state);
		const first = probe({ width: 200, height: 150, now: 16, peak: 4.9 });
		expect(first).toHaveLength(1);
		expect(first[0]).toMatchObject({ x0: 40, y0: 30, x1: 40, y1: 30, color: "#ff0080" });
		let last = first[0]!.intensity;
		for (let t = 32; t <= 400; t += 16)
			last = probe({ width: 200, height: 150, now: t, peak: 4.9 })[0]!.intensity;
		expect(last).toBeCloseTo(3 * 0.8, 5);
		expect(first[0]!.intensity).toBeLessThan(last);
	});

	it("fades out after the pointer leaves, then draws nothing", () => {
		const state = { ...base };
		const probe = createCardSpotlightProbe(() => state);
		for (let t = 16; t <= 400; t += 16) probe({ width: 200, height: 150, now: t, peak: 4.9 });
		state.hovering = false;
		let lights = probe({ width: 200, height: 150, now: 416, peak: 4.9 });
		expect(lights).toHaveLength(1);
		for (let t = 432; t <= 900; t += 16)
			lights = probe({ width: 200, height: 150, now: t, peak: 4.9 });
		expect(lights).toHaveLength(0);
	});
});
