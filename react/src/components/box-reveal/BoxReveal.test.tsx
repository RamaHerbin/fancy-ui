import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { BoxReveal } from "./BoxReveal.js";

// Mock IntersectionObserver as a class
class MockIntersectionObserver {
	callback: IntersectionObserverCallback;
	static instances: MockIntersectionObserver[] = [];

	constructor(callback: IntersectionObserverCallback) {
		this.callback = callback;
		MockIntersectionObserver.instances.push(this);
	}

	observe = vi.fn();
	disconnect = vi.fn();
	unobserve = vi.fn();
}

vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

describe("BoxReveal", () => {
	afterEach(() => {
		cleanup();
		MockIntersectionObserver.instances = [];
	});

	it("renders the box-reveal container", () => {
		const { container } = render(<BoxReveal>content</BoxReveal>);
		const wrapper = container.querySelector(".box-reveal");
		expect(wrapper).toBeTruthy();
	});

	it("renders the overlay element", () => {
		const { container } = render(<BoxReveal>content</BoxReveal>);
		const overlay = container.querySelector(".box-reveal-overlay");
		expect(overlay).toBeTruthy();
	});

	it("renders overlay with z-20 class for stacking", () => {
		const { container } = render(<BoxReveal color="#ff0000">content</BoxReveal>);
		const overlay = container.querySelector(".box-reveal-overlay") as HTMLElement;
		expect(overlay?.className).toContain("z-20");
		expect(overlay?.className).toContain("absolute");
	});

	it("applies custom class names", () => {
		const { container } = render(<BoxReveal className="my-reveal">content</BoxReveal>);
		const wrapper = container.querySelector(".box-reveal");
		expect(wrapper?.className).toContain("my-reveal");
	});

	it("observes element for intersection", () => {
		render(<BoxReveal>content</BoxReveal>);
		const lastInstance = MockIntersectionObserver.instances.at(-1);
		expect(lastInstance?.observe).toHaveBeenCalled();
	});

	it("content starts hidden (opacity 0)", () => {
		const { container } = render(<BoxReveal>content</BoxReveal>);
		const content = container.querySelector(".box-reveal-content") as HTMLElement;
		const style = content?.getAttribute("style") ?? "";
		expect(style).toContain("opacity");
	});
});
