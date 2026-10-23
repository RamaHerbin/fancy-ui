import { act, cleanup, render } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The HDR layer needs WebGPU, which jsdom lacks: the gate and the start are
// mocked so the component's wiring (mount-only canvas, data-hdr, teardown,
// device loss) can be checked on its own.
const hdr = vi.hoisted(() => ({
	available: true,
	layers: [] as Array<{
		render: ReturnType<typeof vi.fn>;
		destroy: ReturnType<typeof vi.fn>;
		lose: () => void;
		lost: Promise<void>;
	}>,
	start: vi.fn(),
}));

vi.mock("./pixel-scene-hdr.js", () => ({
	pixelSceneHdrAvailable: () => hdr.available,
	startPixelSceneHdr: (canvas: HTMLCanvasElement) => hdr.start(canvas),
}));

import { PixelScene } from "./PixelScene.js";

const originalGetContext = HTMLCanvasElement.prototype.getContext;

function fakeCtx() {
	return {
		fillStyle: "",
		globalAlpha: 1,
		setTransform: vi.fn(),
		clearRect: vi.fn(),
		fillRect: vi.fn(),
	};
}

function makeLayer() {
	let lose = () => {};
	const lost = new Promise<void>((resolve) => {
		lose = resolve;
	});
	const layer = { render: vi.fn(), destroy: vi.fn(), lose, lost };
	hdr.layers.push(layer);
	return layer;
}

async function flush() {
	await act(async () => {
		await Promise.resolve();
		await Promise.resolve();
	});
}

beforeEach(() => {
	hdr.available = true;
	hdr.layers.length = 0;
	hdr.start.mockReset();
	hdr.start.mockImplementation(async () => makeLayer());
	vi.stubGlobal(
		"requestAnimationFrame",
		vi.fn(() => 1)
	);
	vi.stubGlobal("cancelAnimationFrame", vi.fn());
	HTMLCanvasElement.prototype.getContext = vi.fn(() => fakeCtx()) as never;
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	HTMLCanvasElement.prototype.getContext = originalGetContext;
});

describe("PixelScene HDR wiring", () => {
	it("adds the HDR canvas after mount, starts the layer and sets data-hdr", async () => {
		const { container } = render(<PixelScene />);
		await flush();
		const el = container.querySelector(".pixel-scene") as HTMLDivElement;
		const hdrCanvas = el.querySelector(".pixel-scene__hdr");
		expect(hdrCanvas).not.toBeNull();
		expect(hdrCanvas!.getAttribute("aria-hidden")).toBe("true");
		expect(hdr.start).toHaveBeenCalledWith(hdrCanvas);
		expect(el.hasAttribute("data-hdr")).toBe(true);
	});

	it("renders no HDR canvas when hdr is false or the display is SDR", async () => {
		const a = render(<PixelScene hdr={false} />);
		await flush();
		expect(a.container.querySelector(".pixel-scene__hdr")).toBeNull();
		a.unmount();
		hdr.available = false;
		const b = render(<PixelScene />);
		await flush();
		expect(b.container.querySelector(".pixel-scene__hdr")).toBeNull();
		expect(hdr.start).not.toHaveBeenCalled();
	});

	it("drops the canvas when the layer cannot start", async () => {
		hdr.start.mockImplementation(async () => null);
		const { container } = render(<PixelScene />);
		await flush();
		expect(container.querySelector(".pixel-scene__hdr")).toBeNull();
		expect(container.querySelector(".pixel-scene")!.hasAttribute("data-hdr")).toBe(false);
	});

	it("destroys the layer on unmount", async () => {
		const { unmount } = render(<PixelScene />);
		await flush();
		const live = hdr.layers.at(-1)!;
		unmount();
		expect(live.destroy).toHaveBeenCalledTimes(1);
	});

	it("tears down and removes the canvas when the device is lost", async () => {
		const { container } = render(<PixelScene />);
		await flush();
		const live = hdr.layers.at(-1)!;
		live.lose();
		await flush();
		expect(live.destroy).toHaveBeenCalled();
		expect(container.querySelector(".pixel-scene__hdr")).toBeNull();
		expect(container.querySelector(".pixel-scene")!.hasAttribute("data-hdr")).toBe(false);
	});

	it("keeps exactly one live layer under StrictMode's double mount", async () => {
		render(
			<StrictMode>
				<PixelScene />
			</StrictMode>
		);
		await flush();
		const live = hdr.layers.filter((l) => l.destroy.mock.calls.length === 0);
		expect(live).toHaveLength(1);
	});
});
