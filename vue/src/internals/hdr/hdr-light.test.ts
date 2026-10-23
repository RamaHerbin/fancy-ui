import { afterEach, describe, expect, it, vi } from "vitest";
import { attachHdrLight, HDR_PEAK } from "./hdr-light.js";

function stubDynamicRange(high: boolean) {
	vi.stubGlobal(
		"matchMedia",
		vi.fn((q: string) => ({
			matches: q.includes("dynamic-range: high") ? high : false,
			media: q,
			addEventListener() {},
			removeEventListener() {},
		}))
	);
}

afterEach(() => {
	vi.unstubAllGlobals();
	document.body.innerHTML = "";
});

describe("hdr-light", () => {
	it("pins the peak near 1000 nits against a 203-nit reference white", () => {
		expect(HDR_PEAK * 203).toBeGreaterThan(950);
		expect(HDR_PEAK * 203).toBeLessThan(1050);
	});

	it("does nothing on an SDR display: no probe call, no data-hdr", async () => {
		stubDynamicRange(false);
		const host = document.createElement("div");
		const canvas = document.createElement("canvas");
		host.appendChild(canvas);
		const probe = vi.fn(() => []);
		const detach = attachHdrLight({ host, canvas, probe });
		await new Promise((r) => setTimeout(r, 10));
		expect(probe).not.toHaveBeenCalled();
		expect(host.hasAttribute("data-hdr")).toBe(false);
		expect(() => detach()).not.toThrow();
	});

	it("does nothing without WebGPU even when the display reports HDR", async () => {
		stubDynamicRange(true);
		const host = document.createElement("div");
		const canvas = document.createElement("canvas");
		const probe = vi.fn(() => []);
		const detach = attachHdrLight({ host, canvas, probe });
		await new Promise((r) => setTimeout(r, 10));
		expect(probe).not.toHaveBeenCalled();
		expect(host.hasAttribute("data-hdr")).toBe(false);
		detach();
	});
});
