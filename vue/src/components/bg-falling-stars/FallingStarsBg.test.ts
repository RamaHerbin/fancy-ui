import { cleanup, render } from "@testing-library/vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FallingStarsBg from "./FallingStarsBg.vue";

describe("FallingStarsBg", () => {
	beforeEach(() => {
		// Mock ResizeObserver (not available in jsdom) - must be a class
		global.ResizeObserver = class {
			observe = vi.fn();
			unobserve = vi.fn();
			disconnect = vi.fn();
		} as unknown as typeof ResizeObserver;
	});

	afterEach(cleanup);

	it("renders a canvas element", () => {
		const { container } = render(FallingStarsBg);
		const canvas = container.querySelector("canvas");
		expect(canvas).toBeInTheDocument();
	});

	it("canvas has absolute positioning class", () => {
		const { container } = render(FallingStarsBg);
		const canvas = container.querySelector("canvas");
		expect(canvas?.className).toContain("absolute");
	});

	it("canvas has inset-0 class", () => {
		const { container } = render(FallingStarsBg);
		const canvas = container.querySelector("canvas");
		expect(canvas?.className).toContain("inset-0");
	});

	it("canvas has full width and height classes", () => {
		const { container } = render(FallingStarsBg);
		const canvas = container.querySelector("canvas");
		expect(canvas?.className).toContain("h-full");
		expect(canvas?.className).toContain("w-full");
	});

	it("applies custom class names", () => {
		const { container } = render(FallingStarsBg, {
			props: { class: "my-stars" },
		});
		const canvas = container.querySelector("canvas");
		expect(canvas?.className).toContain("my-stars");
	});

	it("preserves base classes when custom class is added", () => {
		const { container } = render(FallingStarsBg, { props: { class: "extra" } });
		const canvas = container.querySelector("canvas");
		expect(canvas?.className).toContain("absolute");
		expect(canvas?.className).toContain("inset-0");
		expect(canvas?.className).toContain("h-full");
		expect(canvas?.className).toContain("w-full");
	});
});
