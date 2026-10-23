import { afterEach, describe, expect, it } from "vitest";
import { strokeLights } from "./pulse-beam-data.js";
import { createPulseBeamProbe } from "./pulse-beam-hdr.js";

afterEach(() => {
	document.body.innerHTML = "";
});

function mount(opacity: string) {
	const host = document.createElement("div");
	const stroke = document.createElement("div");
	stroke.style.opacity = opacity;
	host.appendChild(stroke);
	document.body.appendChild(host);
	return { host, stroke };
}

describe("pulse-beam-hdr", () => {
	it("resolves the stroke blobs to plain anchors and colours", () => {
		const blobs = strokeLights("inner", "colorful");
		expect(blobs.length).toBeGreaterThan(5);
		for (const b of blobs) {
			expect(Number.isFinite(b.fx) && Number.isFinite(b.fy)).toBe(true);
			expect(b.color).toMatch(/^rgb\(|^#|^[a-z]/);
		}
	});

	it("lights a stretch of the ring edge each blob sits on", () => {
		const { host, stroke } = mount("1");
		const blobs = strokeLights("inner", "colorful");
		const probe = createPulseBeamProbe(host, stroke, () => ({ blobs }));
		const lights = probe({ width: 300, height: 120, now: 0, peak: 4.9 });
		expect(lights.length).toBe(blobs.length);
		for (const l of lights) {
			const onHorizontal = l.y0 === l.y1 && (l.y0 === 0 || l.y0 === 120);
			const onVertical = l.x0 === l.x1 && (l.x0 === 0 || l.x0 === 300);
			expect(onHorizontal || onVertical).toBe(true);
		}
	});

	it("follows the loop's custom properties and the layer's fade", () => {
		const { host, stroke } = mount("1");
		const blobs = strokeLights("inner", "colorful").slice(0, 1); // top edge, region 1
		const probe = createPulseBeamProbe(host, stroke, () => ({ blobs }));
		const before = probe({ width: 300, height: 120, now: 0, peak: 4.9 })[0]!;
		host.style.setProperty("--pb-bx1", "20px");
		const after = probe({ width: 300, height: 120, now: 16, peak: 4.9 })[0]!;
		expect(after.x0 + after.x1).toBeCloseTo(before.x0 + before.x1 + 40, 5);
		stroke.style.opacity = "0";
		expect(probe({ width: 300, height: 120, now: 32, peak: 4.9 })).toHaveLength(0);
	});
});
