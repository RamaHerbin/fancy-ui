import { render, cleanup } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import Sparkles from "./Sparkles.svelte";

const originalGetContext = HTMLCanvasElement.prototype.getContext;

describe("Sparkles", () => {
	beforeEach(() => {
		vi.stubGlobal(
			"ResizeObserver",
			class {
				observe() {}
				unobserve() {}
				disconnect() {}
			}
		);
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		HTMLCanvasElement.prototype.getContext = originalGetContext;
	});

	it("renders container div", () => {
		const { container } = render(Sparkles);
		const div = container.firstElementChild as HTMLElement;
		expect(div).toBeInTheDocument();
		expect(div.tagName).toBe("DIV");
	});

	it("renders canvas element inside container", () => {
		const { container } = render(Sparkles);
		const canvas = container.querySelector("canvas");
		expect(canvas).toBeInTheDocument();
	});

	it("applies default background style", () => {
		const { container } = render(Sparkles);
		const div = container.firstElementChild as HTMLElement;
		const style = div?.getAttribute("style") ?? "";
		expect(style).toContain("background");
		// jsdom converts hex to rgb
		expect(style).toMatch(/background.*rgb\(13,\s*71,\s*161\)|#0d47a1/);
	});

	it("applies custom background style", () => {
		const { container } = render(Sparkles, {
			props: { background: "#ff0000" },
		});
		const div = container.firstElementChild as HTMLElement;
		const style = div?.getAttribute("style") ?? "";
		expect(style).toMatch(/rgb\(255,\s*0,\s*0\)|#ff0000/);
	});

	it("applies custom class", () => {
		const { container } = render(Sparkles, { props: { class: "my-sparkles" } });
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("my-sparkles");
	});

	it("has overflow-hidden class", () => {
		const { container } = render(Sparkles);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("overflow-hidden");
	});

	it("preserves base classes when custom class is added", () => {
		const { container } = render(Sparkles, { props: { class: "extra" } });
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("relative");
		expect(div?.className).toContain("overflow-hidden");
		expect(div?.className).toContain("will-change-transform");
	});

	it("canvas has absolute positioning classes", () => {
		const { container } = render(Sparkles);
		const canvas = container.querySelector("canvas") as HTMLElement;
		expect(canvas?.className).toContain("absolute");
		expect(canvas?.className).toContain("inset-0");
	});

	it("draws particles across the whole surface on a HiDPI display", () => {
		const cssWidth = 400;
		const cssHeight = 200;
		vi.stubGlobal("devicePixelRatio", 2);
		vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
			width: cssWidth,
			height: cssHeight,
			top: 0,
			left: 0,
			right: cssWidth,
			bottom: cssHeight,
			x: 0,
			y: 0,
			toJSON: () => ({}),
		} as DOMRect);

		const arcCalls: Array<{ x: number; y: number }> = [];
		const fakeCtx = {
			setTransform: vi.fn(),
			clearRect: vi.fn(),
			beginPath: vi.fn(),
			arc: vi.fn((x: number, y: number) => {
				arcCalls.push({ x, y });
			}),
			fill: vi.fn(),
			fillStyle: "",
		};
		HTMLCanvasElement.prototype.getContext = vi.fn(() => fakeCtx) as never;

		const frames: FrameRequestCallback[] = [];
		vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
			frames.push(cb);
			return frames.length;
		});
		vi.stubGlobal("cancelAnimationFrame", () => {});

		render(Sparkles);
		expect(frames.length).toBeGreaterThan(0);
		frames[0](0);

		expect(arcCalls.length).toBeGreaterThan(0);
		const xs = arcCalls.map((c) => c.x);
		const ys = arcCalls.map((c) => c.y);
		// Coordinates are consumed by a context already scaled by dpr, so they must
		// stay within the CSS-pixel box (plus the small off-screen wrap band),
		// not the device-pixel one.
		expect(Math.max(...xs)).toBeLessThan(cssWidth * 1.1);
		expect(Math.max(...ys)).toBeLessThan(cssHeight * 1.1);
		// ...and still cover the surface rather than clumping in a corner.
		expect(Math.max(...xs)).toBeGreaterThan(cssWidth / 2);
		expect(Math.max(...ys)).toBeGreaterThan(cssHeight / 2);
	});
});
