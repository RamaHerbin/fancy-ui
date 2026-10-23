import { cleanup, render } from "@testing-library/vue";
import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The HDR layer needs WebGPU, which jsdom lacks: the gate and the start are
// mocked so the component's wiring (mount-only canvas, data-hdr, teardown,
// device loss and the restarts after it) can be checked on its own.
const hdr = vi.hoisted(() => ({
	layers: [] as Array<{
		render: ReturnType<typeof vi.fn>;
		destroy: ReturnType<typeof vi.fn>;
		lose: () => void;
		lost: Promise<void>;
	}>,
	start: vi.fn(),
}));

vi.mock("./pixel-scene-hdr.js", () => ({
	PIXEL_SCENE_HDR_RESTARTS: 3,
	PIXEL_SCENE_HDR_RESTART_MS: 600,
	pixelSceneHdrAvailable: () => true,
	startPixelSceneHdr: (canvas: HTMLCanvasElement) => hdr.start(canvas),
}));

import PixelScene from "./PixelScene.vue";

const originalGetContext = HTMLCanvasElement.prototype.getContext;

function makeLayer() {
	let lose = () => {};
	const lost = new Promise<void>((resolve) => {
		lose = resolve;
	});
	const layer = { render: vi.fn(), destroy: vi.fn(), lose, lost };
	hdr.layers.push(layer);
	return layer;
}

beforeEach(() => {
	hdr.layers.length = 0;
	hdr.start.mockReset();
	hdr.start.mockImplementation(async () => makeLayer());
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
		const hdrCanvas = host.querySelector("canvas.pixel-scene__hdr");
		expect(hdrCanvas?.getAttribute("aria-hidden")).toBe("true");
		expect(host.hasAttribute("data-hdr")).toBe(true);
		expect(hdr.start).toHaveBeenCalledWith(hdrCanvas);
		unmount();
		expect(hdr.layers.at(-1)!.destroy).toHaveBeenCalledTimes(1);
	});

	it("drops the HDR canvas with hdr off", async () => {
		const { container, rerender } = render(PixelScene);
		await flushPromises();
		await rerender({ hdr: false });
		await flushPromises();
		expect(container.querySelector(".pixel-scene__hdr")).toBeNull();
		expect(hdr.layers.at(-1)!.destroy).toHaveBeenCalledTimes(1);
		expect(container.querySelector(".pixel-scene")!.hasAttribute("data-hdr")).toBe(false);
	});

	it("drops the canvas when the layer cannot start", async () => {
		hdr.start.mockImplementation(async () => null);
		const { container } = render(PixelScene);
		await flushPromises();
		expect(container.querySelector(".pixel-scene__hdr")).toBeNull();
		expect(container.querySelector(".pixel-scene")!.hasAttribute("data-hdr")).toBe(false);
	});

	it("starts the layer again after a device loss and drops the canvas after the third", async () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		try {
			const { container } = render(PixelScene);
			await flushPromises();
			const el = container.querySelector(".pixel-scene") as HTMLDivElement;
			for (let attempt = 1; attempt <= 3; attempt++) {
				const live = hdr.layers.at(-1)!;
				live.lose();
				await flushPromises();
				expect(live.destroy).toHaveBeenCalledTimes(1);
				// Waiting for the restart: the canvas stays, data-hdr is off.
				expect(container.querySelector(".pixel-scene__hdr")).not.toBeNull();
				expect(el.hasAttribute("data-hdr")).toBe(false);
				expect(hdr.start).toHaveBeenCalledTimes(attempt);
				vi.advanceTimersByTime(600 * attempt);
				await flushPromises();
				expect(hdr.start).toHaveBeenCalledTimes(attempt + 1);
				expect(el.hasAttribute("data-hdr")).toBe(true);
			}
			hdr.layers.at(-1)!.lose();
			await flushPromises();
			expect(container.querySelector(".pixel-scene__hdr")).toBeNull();
			expect(el.hasAttribute("data-hdr")).toBe(false);
			expect(hdr.start).toHaveBeenCalledTimes(4);
		} finally {
			vi.useRealTimers();
		}
	});

	it("counts a restart that cannot start as an attempt instead of giving up", async () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		try {
			const { container } = render(PixelScene);
			await flushPromises();
			hdr.start.mockImplementationOnce(async () => null);
			hdr.layers.at(-1)!.lose();
			await flushPromises();
			vi.advanceTimersByTime(600);
			await flushPromises();
			expect(hdr.start).toHaveBeenCalledTimes(2);
			expect(container.querySelector(".pixel-scene__hdr")).not.toBeNull();
			vi.advanceTimersByTime(1200);
			await flushPromises();
			expect(hdr.start).toHaveBeenCalledTimes(3);
			expect(container.querySelector(".pixel-scene")!.hasAttribute("data-hdr")).toBe(true);
		} finally {
			vi.useRealTimers();
		}
	});
});
