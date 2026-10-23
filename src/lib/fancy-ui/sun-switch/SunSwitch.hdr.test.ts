import { cleanup, render } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The HDR layer needs WebGPU, which jsdom lacks: the gate and the start are
// mocked so the component's wiring (mount-only canvas, data-hdr, teardown,
// device loss and the restarts after it) can be checked on its own.
const hdr = vi.hoisted(() => ({
	available: true,
	layers: [] as Array<{
		sink: { clear: () => void; push: () => void };
		render: ReturnType<typeof vi.fn>;
		destroy: ReturnType<typeof vi.fn>;
		lose: () => void;
		lost: Promise<void>;
	}>,
	start: vi.fn(),
}));

vi.mock("./sun-switch-hdr.js", () => ({
	SUN_HDR_RESTARTS: 3,
	SUN_HDR_RESTART_MS: 600,
	sunHdrAvailable: () => hdr.available,
	startSunHdr: (canvas: HTMLCanvasElement) => hdr.start(canvas),
}));

import SunSwitch from "./SunSwitch.svelte";

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
	const layer = {
		sink: { clear: () => {}, push: () => {} },
		render: vi.fn(),
		destroy: vi.fn(),
		lose,
		lost,
	};
	hdr.layers.push(layer);
	return layer;
}

/** Mount → effects → start promise → effects again: a few rounds of microtasks. */
async function flush() {
	for (let i = 0; i < 4; i++) {
		await tick();
		await Promise.resolve();
	}
}

function host(container: HTMLElement) {
	return container.querySelector("button") as HTMLButtonElement;
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

describe("SunSwitch HDR wiring", () => {
	it("adds the HDR canvas after mount, starts the layer, renders the sun into it and sets data-hdr", async () => {
		const { container } = render(SunSwitch);
		await flush();
		const el = host(container);
		const hdrCanvas = el.querySelector(".ft-sun-switch-hdr");
		expect(hdrCanvas).not.toBeNull();
		expect(hdrCanvas!.getAttribute("aria-hidden")).toBe("true");
		expect(hdr.start).toHaveBeenCalledWith(hdrCanvas);
		expect(el.hasAttribute("data-hdr")).toBe(true);
		expect(hdr.layers.at(-1)!.render).toHaveBeenCalled();
	});

	it("renders no HDR canvas when hdr is false or the display is SDR", async () => {
		const a = render(SunSwitch, { props: { hdr: false } });
		await flush();
		expect(a.container.querySelector(".ft-sun-switch-hdr")).toBeNull();
		a.unmount();
		hdr.available = false;
		const b = render(SunSwitch);
		await flush();
		expect(b.container.querySelector(".ft-sun-switch-hdr")).toBeNull();
		expect(hdr.start).not.toHaveBeenCalled();
	});

	it("drops the canvas when the layer cannot start", async () => {
		hdr.start.mockImplementation(async () => null);
		const { container } = render(SunSwitch);
		await flush();
		expect(container.querySelector(".ft-sun-switch-hdr")).toBeNull();
		expect(host(container).hasAttribute("data-hdr")).toBe(false);
	});

	it("destroys the layer on unmount", async () => {
		const { unmount } = render(SunSwitch);
		await flush();
		const live = hdr.layers.at(-1)!;
		unmount();
		expect(live.destroy).toHaveBeenCalledTimes(1);
	});

	it("starts the layer again after a device loss and drops the canvas after the third", async () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		try {
			const { container } = render(SunSwitch);
			await flush();
			const el = host(container);
			for (let attempt = 1; attempt <= 3; attempt++) {
				const live = hdr.layers.at(-1)!;
				live.lose();
				await flush();
				expect(live.destroy).toHaveBeenCalledTimes(1);
				// Waiting for the restart: the canvas stays, data-hdr is off.
				expect(container.querySelector(".ft-sun-switch-hdr")).not.toBeNull();
				expect(el.hasAttribute("data-hdr")).toBe(false);
				expect(hdr.start).toHaveBeenCalledTimes(attempt);
				vi.advanceTimersByTime(600 * attempt);
				await flush();
				expect(hdr.start).toHaveBeenCalledTimes(attempt + 1);
				expect(el.hasAttribute("data-hdr")).toBe(true);
			}
			hdr.layers.at(-1)!.lose();
			await flush();
			expect(container.querySelector(".ft-sun-switch-hdr")).toBeNull();
			expect(el.hasAttribute("data-hdr")).toBe(false);
			expect(hdr.start).toHaveBeenCalledTimes(4);
		} finally {
			vi.useRealTimers();
		}
	});
});
