import { cleanup, render } from "@testing-library/vue";
import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const layer = vi.hoisted(() => {
	let loseLayer: () => void = () => {};
	return {
		render: vi.fn(),
		destroy: vi.fn(),
		lost: new Promise<void>((resolve) => (loseLayer = resolve)),
		lose: () => loseLayer(),
	};
});

vi.mock("./pixel-scene-hdr.js", () => ({
	pixelSceneHdrAvailable: () => true,
	startPixelSceneHdr: vi.fn(async () => layer),
}));

import PixelScene from "./PixelScene.vue";

const originalGetContext = HTMLCanvasElement.prototype.getContext;

beforeEach(() => {
	vi.stubGlobal(
		"requestAnimationFrame",
		vi.fn(() => 1)
	);
	vi.stubGlobal("cancelAnimationFrame", vi.fn());
	HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
		fillStyle: "",
		globalAlpha: 1,
		setTransform: vi.fn(),
		clearRect: vi.fn(),
		fillRect: vi.fn(),
	})) as never;
	layer.destroy.mockClear();
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	HTMLCanvasElement.prototype.getContext = originalGetContext;
});

describe("PixelScene HDR wiring", () => {
	it("adds the HDR canvas after mount, marks data-hdr, and destroys the layer on unmount", async () => {
		const { container, unmount } = render(PixelScene);
		await flushPromises();
		const host = container.querySelector(".pixel-scene") as HTMLDivElement;
		const hdr = host.querySelector("canvas.pixel-scene__hdr");
		expect(hdr?.getAttribute("aria-hidden")).toBe("true");
		expect(host.hasAttribute("data-hdr")).toBe(true);
		unmount();
		expect(layer.destroy).toHaveBeenCalledTimes(1);
	});

	it("drops the HDR canvas with hdr off", async () => {
		const { container, rerender } = render(PixelScene);
		await flushPromises();
		await rerender({ hdr: false });
		await flushPromises();
		expect(container.querySelector(".pixel-scene__hdr")).toBeNull();
		expect(layer.destroy).toHaveBeenCalledTimes(1);
		expect(container.querySelector(".pixel-scene")!.hasAttribute("data-hdr")).toBe(false);
	});

	it("tears the layer down when the device is lost", async () => {
		const { container } = render(PixelScene);
		await flushPromises();
		layer.lose();
		await flushPromises();
		expect(layer.destroy).toHaveBeenCalled();
		expect(container.querySelector(".pixel-scene__hdr")).toBeNull();
		expect(container.querySelector(".pixel-scene")!.hasAttribute("data-hdr")).toBe(false);
	});
});
