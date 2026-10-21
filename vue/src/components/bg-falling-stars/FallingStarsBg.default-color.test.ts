import { cleanup, render } from "@testing-library/vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FallingStarsBg from "./FallingStarsBg.vue";
import { createFallingStars } from "./bg-falling-stars-core.js";

vi.mock("./bg-falling-stars-core.js", () => ({
	createFallingStars: vi.fn(() => null),
}));

describe("FallingStarsBg default colour", () => {
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
		vi.mocked(createFallingStars).mockClear();
	});

	afterEach(cleanup);

	it("resolves to currentColor so the effect follows the theme's text colour", () => {
		render(FallingStarsBg);
		expect(createFallingStars).toHaveBeenCalledTimes(1);
		const options = vi.mocked(createFallingStars).mock.calls[0]![1];
		expect(options.color).toBe("currentColor");
	});

	it("keeps an explicit colour untouched", () => {
		render(FallingStarsBg, { props: { color: "#ff0000" } });
		const options = vi.mocked(createFallingStars).mock.calls[0]![1];
		expect(options.color).toBe("#ff0000");
	});
});
