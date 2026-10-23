import { afterEach, describe, expect, it, vi } from "vitest";
import { attachHdrLight, HDR_PEAK, hdrLightAvailable, watchHdrLight } from "./hdr-light.js";

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

	it("follows dynamic-range changes while attached, and lets go on detach", () => {
		const add = vi.fn();
		const remove = vi.fn();
		vi.stubGlobal(
			"matchMedia",
			vi.fn((q: string) => ({
				matches: false,
				media: q,
				addEventListener: add,
				removeEventListener: remove,
			}))
		);
		const host = document.createElement("div");
		const canvas = document.createElement("canvas");
		const detach = attachHdrLight({ host, canvas, probe: () => [] });
		expect(add).toHaveBeenCalledWith("change", expect.any(Function));
		expect(remove).not.toHaveBeenCalled();
		detach();
		expect(remove).toHaveBeenCalledWith("change", add.mock.calls[0]?.[1]);
	});

	it("reports availability only with WebGPU and an HDR display", () => {
		stubDynamicRange(true);
		expect(hdrLightAvailable()).toBe(false); // jsdom: no navigator.gpu
		vi.stubGlobal("navigator", { ...navigator, gpu: {} });
		expect(hdrLightAvailable()).toBe(true);
		stubDynamicRange(false);
		expect(hdrLightAvailable()).toBe(false);
	});

	it("re-reports availability when the window changes display, until unsubscribed", () => {
		let high = false;
		const listeners = new Set<() => void>();
		vi.stubGlobal("navigator", { ...navigator, gpu: {} });
		vi.stubGlobal(
			"matchMedia",
			vi.fn((q: string) => ({
				get matches() {
					return q.includes("dynamic-range: high") && high;
				},
				media: q,
				addEventListener: (_: string, fn: () => void) => listeners.add(fn),
				removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
			}))
		);
		const seen: boolean[] = [];
		const stop = watchHdrLight((available) => seen.push(available));
		expect(seen).toEqual([false]);
		high = true;
		listeners.forEach((fn) => fn());
		high = false;
		listeners.forEach((fn) => fn());
		expect(seen).toEqual([false, true, false]);
		stop();
		expect(listeners.size).toBe(0);
	});
});
