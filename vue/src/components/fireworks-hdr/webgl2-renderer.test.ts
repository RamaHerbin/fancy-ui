import { describe, it, expect } from "vitest";
import { startWebGl2Fireworks, STRETCH } from "./webgl2-renderer.js";

// jsdom provides no WebGL2 context (canvas.getContext returns null / throws
// "Not implemented"), so these exercise the graceful no-renderer path: the
// factory must return null without throwing, letting FireworksHdr.svelte try
// nothing further and stay silent. Real GPU behavior is covered by the app's
// Playwright e2e, not here.
describe("startWebGl2Fireworks (jsdom, no WebGL2)", () => {
	function makeCanvas(): HTMLCanvasElement {
		const canvas = document.createElement("canvas");
		// Give it a non-zero CSS box so the priming path would run if a context existed.
		Object.defineProperty(canvas, "clientWidth", { value: 800, configurable: true });
		Object.defineProperty(canvas, "clientHeight", { value: 600, configurable: true });
		return canvas;
	}

	it("returns null when no WebGL2 context is available", () => {
		const handle = startWebGl2Fireworks(makeCanvas(), { maxInstances: 1280 });
		expect(handle).toBeNull();
	});

	it("does not throw for any of the option shapes", () => {
		expect(() =>
			startWebGl2Fireworks(makeCanvas(), {
				maxInstances: 2560,
				renderScale: 0.5,
				exposure: 2.6,
				hdr: true,
			})
		).not.toThrow();
		expect(() =>
			startWebGl2Fireworks(makeCanvas(), { maxInstances: 4096, hdr: false })
		).not.toThrow();
	});

	it("re-exports STRETCH (the instance velocity-stretch constant)", () => {
		expect(typeof STRETCH).toBe("number");
		expect(STRETCH).toBeGreaterThan(0);
	});
});
