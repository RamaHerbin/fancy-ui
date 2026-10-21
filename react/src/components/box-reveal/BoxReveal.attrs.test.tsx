import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { BoxReveal } from "./BoxReveal.js";

class MockIntersectionObserver {
	observe = vi.fn();
	disconnect = vi.fn();
	unobserve = vi.fn();
	takeRecords = vi.fn(() => []);
}
vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
vi.stubGlobal("matchMedia", (query: string) => ({
	matches: false,
	media: query,
	onchange: null,
	addEventListener: () => {},
	removeEventListener: () => {},
	dispatchEvent: () => false,
	addListener: () => {},
	removeListener: () => {},
}));

describe("BoxReveal native attributes", () => {
	afterEach(cleanup);

	it("BoxReveal forwards id, data-testid and aria-label to the <div>", () => {
		const { getByTestId } = render(
			<BoxReveal id={"the-id"} data-testid={"the-el"} aria-label={"the label"}>
				x
			</BoxReveal>
		);
		const el = getByTestId("the-el");
		expect(el.tagName).toBe("DIV");
		expect(el.matches(".box-reveal")).toBe(true);
		expect(el.id).toBe("the-id");
		expect(el).toHaveAttribute("aria-label", "the label");
	});

	it("BoxReveal keeps its own classes next to a consumer class", () => {
		const { container } = render(
			<BoxReveal className="extra-x" data-testid="the-el">
				x
			</BoxReveal>
		);
		const el = container.querySelector("[data-testid]") ?? container.firstElementChild;
		expect(el?.className).toContain("box-reveal");
		expect(el?.className).toContain("extra-x");
	});
});
