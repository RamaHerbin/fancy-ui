import { cleanup, render } from "@testing-library/vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FlickeringGrid from "./FlickeringGrid.vue";
import { createFlickeringGrid } from "./flickering-grid-core.js";

vi.mock("./flickering-grid-core.js", () => ({
	createFlickeringGrid: vi.fn(() => null),
}));

describe("FlickeringGrid default colour", () => {
	beforeEach(() => {
		global.ResizeObserver = class {
			observe = vi.fn();
			unobserve = vi.fn();
			disconnect = vi.fn();
		} as unknown as typeof ResizeObserver;
		global.IntersectionObserver = class {
			observe = vi.fn();
			unobserve = vi.fn();
			disconnect = vi.fn();
		} as unknown as typeof IntersectionObserver;
		vi.mocked(createFlickeringGrid).mockClear();
	});

	afterEach(cleanup);

	it("resolves to currentColor so the effect follows the theme's text colour", () => {
		render(FlickeringGrid);
		expect(createFlickeringGrid).toHaveBeenCalledTimes(1);
		const options = vi.mocked(createFlickeringGrid).mock.calls[0]![1];
		expect(options.color).toBe("currentColor");
	});

	it("keeps an explicit colour untouched", () => {
		render(FlickeringGrid, { props: { color: "#ff0000" } });
		const options = vi.mocked(createFlickeringGrid).mock.calls[0]![1];
		expect(options.color).toBe("#ff0000");
	});
});
