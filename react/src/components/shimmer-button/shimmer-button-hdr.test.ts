import { afterEach, describe, expect, it } from "vitest";
import { createShimmerProbe, sweepX } from "./shimmer-button-hdr.js";

afterEach(() => {
	document.body.innerHTML = "";
});

describe("shimmer-button-hdr", () => {
	it("maps the sweep's background-position to the band centre", () => {
		// 250%-wide image: at 0% the band sits 1.25 widths in, at 100% a quarter width out.
		expect(sweepX(100, 0)).toBeCloseTo(125, 5);
		expect(sweepX(100, 1)).toBeCloseTo(-25, 5);
		expect(sweepX(100, 0.5)).toBeCloseTo(50, 5);
	});

	it("draws a leaning glint across the button mid-sweep", () => {
		const button = document.createElement("button");
		const sheen = document.createElement("span");
		sheen.style.backgroundPositionX = "50%";
		button.appendChild(sheen);
		document.body.appendChild(button);
		const probe = createShimmerProbe(button, sheen, () => ({ color: "#fff" }));
		const [glint] = probe({ width: 160, height: 40, now: 16, peak: 4.9 });
		expect(glint).toBeDefined();
		expect((glint!.x0 + glint!.x1) / 2).toBeCloseTo(80, 5);
		expect(glint!.x0).toBeGreaterThan(glint!.x1);
		expect(glint!.y0).toBe(0);
		expect(glint!.y1).toBe(40);
	});

	it("draws nothing while the band rests off the button, or when disabled", () => {
		const button = document.createElement("button");
		const sheen = document.createElement("span");
		sheen.style.backgroundPositionX = "0%";
		button.appendChild(sheen);
		document.body.appendChild(button);
		const probe = createShimmerProbe(button, sheen, () => ({ color: "#fff" }));
		expect(probe({ width: 160, height: 40, now: 16, peak: 4.9 })).toHaveLength(0);
		sheen.style.backgroundPositionX = "50%";
		button.disabled = true;
		expect(probe({ width: 160, height: 40, now: 32, peak: 4.9 })).toHaveLength(0);
	});
});
