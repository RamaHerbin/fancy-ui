import { cleanup, fireEvent, render } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PixelScene } from "./PixelScene.js";

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
		const { container } = render(
			<PixelScene className="h-80 w-full">
				<p>Copy</p>
			</PixelScene>
		);
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

	it("renders no content wrapper without children", () => {
		const { container } = render(<PixelScene />);
		expect(container.querySelector(".pixel-scene__content")).toBeNull();
	});

	it("renders no HDR canvas without WebGPU", () => {
		const { container } = render(<PixelScene hdr />);
		expect(container.querySelector(".pixel-scene__hdr")).toBeNull();
		expect(host(container).hasAttribute("data-hdr")).toBe(false);
	});

	it("passes rest props and onClick to the host", () => {
		const onClick = vi.fn();
		const { container } = render(
			<PixelScene id="hero" aria-label="Landscape" data-testid="scene" onClick={onClick} />
		);
		const el = host(container);
		expect(el.id).toBe("hero");
		expect(el.getAttribute("aria-label")).toBe("Landscape");
		expect(el.dataset.testid).toBe("scene");
		fireEvent.click(el);
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("reflects scene and night, and survives prop changes", () => {
		const { container, rerender } = render(<PixelScene scene="sea" night={false} />);
		const el = host(container);
		expect(el.dataset.scene).toBe("sea");
		expect(el.hasAttribute("data-night")).toBe(false);
		rerender(<PixelScene scene="meadow" night cell={8} lensRadius={12} paused />);
		expect(el.dataset.scene).toBe("meadow");
		expect(el.hasAttribute("data-night")).toBe(true);
	});

	it("does not throw without a 2D context, on prop changes or on unmount", () => {
		HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never;
		const { rerender, unmount } = render(<PixelScene scene="alpine" />);
		rerender(<PixelScene scene="mountains" night />);
		expect(() => unmount()).not.toThrow();
	});

	it("forwards the ref to the host", () => {
		const ref = createRef<HTMLDivElement>();
		const { container } = render(<PixelScene ref={ref} />);
		expect(ref.current).toBe(host(container));
	});

	it("tears the engine down on unmount", () => {
		const removeSpy = vi.spyOn(HTMLElement.prototype, "removeEventListener");
		const { unmount } = render(<PixelScene />);
		const before = removeSpy.mock.calls.length;
		unmount();
		expect(removeSpy.mock.calls.length).toBeGreaterThan(before);
		removeSpy.mockRestore();
	});
});
