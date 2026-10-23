import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PixelScene from "./PixelScene.svelte";

const rafs: FrameRequestCallback[] = [];
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

function host(container: HTMLElement) {
	return container.querySelector(".pixel-scene") as HTMLDivElement;
}

beforeEach(() => {
	rafs.length = 0;
	vi.stubGlobal(
		"requestAnimationFrame",
		vi.fn((cb: FrameRequestCallback) => rafs.push(cb))
	);
	vi.stubGlobal("cancelAnimationFrame", vi.fn());
	HTMLCanvasElement.prototype.getContext = vi.fn(() => fakeCtx()) as never;
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	HTMLCanvasElement.prototype.getContext = originalGetContext;
});

describe("PixelScene", () => {
	it("renders the host, one aria-hidden canvas and the children", () => {
		const children = createRawSnippet(() => ({ render: () => "<p>Copy</p>" }));
		const { container } = render(PixelScene, { props: { class: "h-80 w-full", children } });
		const el = host(container);
		expect(el.className).toContain("relative");
		expect(el.className).toContain("overflow-hidden");
		expect(el.className).toContain("h-80");
		expect(el.dataset.scene).toBe("alpine");
		const canvases = el.querySelectorAll("canvas");
		expect(canvases).toHaveLength(1);
		expect(canvases[0]!.getAttribute("aria-hidden")).toBe("true");
		expect(el.querySelector(".pixel-scene__content p")?.textContent).toBe("Copy");
	});

	it("renders no HDR canvas without WebGPU", async () => {
		const { container } = render(PixelScene, { props: { hdr: true } });
		await tick();
		expect(container.querySelector(".pixel-scene__hdr")).toBeNull();
		expect(host(container).hasAttribute("data-hdr")).toBe(false);
	});

	it("passes rest props and onclick to the host", async () => {
		const onclick = vi.fn();
		const { container } = render(PixelScene, {
			props: { id: "hero", "aria-label": "Landscape", onclick },
		});
		const el = host(container);
		expect(el.id).toBe("hero");
		expect(el.getAttribute("aria-label")).toBe("Landscape");
		await fireEvent.click(el);
		expect(onclick).toHaveBeenCalledTimes(1);
	});

	it("reflects scene and night, and survives prop changes", async () => {
		const { container, rerender } = render(PixelScene, { props: { scene: "sea", night: false } });
		const el = host(container);
		expect(el.dataset.scene).toBe("sea");
		expect(el.hasAttribute("data-night")).toBe(false);
		await rerender({ scene: "meadow", night: true, cell: 8, lensRadius: 12, paused: true });
		expect(el.dataset.scene).toBe("meadow");
		expect(el.hasAttribute("data-night")).toBe(true);
	});

	it("does not throw without a 2D context, on prop changes or on unmount", async () => {
		HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never;
		const { rerender, unmount } = render(PixelScene, { props: { scene: "alpine" } });
		await rerender({ scene: "mountains", night: true });
		expect(() => unmount()).not.toThrow();
	});

	it("binds ref to the host", () => {
		let ref: HTMLDivElement | null = null;
		const { container } = render(PixelScene, {
			props: {
				get ref() {
					return ref;
				},
				set ref(v) {
					ref = v;
				},
			},
		});
		expect(ref).toBe(host(container));
	});
});
