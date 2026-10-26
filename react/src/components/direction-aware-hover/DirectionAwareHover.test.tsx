import { render, cleanup, fireEvent, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { DirectionAwareHover } from "./DirectionAwareHover.js";

describe("DirectionAwareHover", () => {
	beforeEach(() => {
		// Mock window.matchMedia (not available in jsdom)
		Object.defineProperty(window, "matchMedia", {
			writable: true,
			value: vi.fn().mockImplementation((query: string) => ({
				matches: false,
				media: query,
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			})),
		});
	});

	afterEach(cleanup);

	it("renders a figure container", () => {
		const { container } = render(<DirectionAwareHover imageUrl="/test.jpg" />);
		const figure = container.querySelector('[role="figure"]');
		expect(figure).toBeInTheDocument();
	});

	it("renders an image with correct src", () => {
		const { container } = render(<DirectionAwareHover imageUrl="/test.jpg" />);
		const img = container.querySelector("img");
		expect(img).toHaveAttribute("src", "/test.jpg");
	});

	it("renders an image with correct alt", () => {
		const { container } = render(<DirectionAwareHover imageUrl="/test.jpg" imageAlt="My image" />);
		const img = container.querySelector("img");
		expect(img).toHaveAttribute("alt", "My image");
	});

	it("uses default alt text", () => {
		const { container } = render(<DirectionAwareHover imageUrl="/test.jpg" />);
		const img = container.querySelector("img");
		expect(img).toHaveAttribute("alt", "image");
	});

	it("has overflow-hidden class on the container", () => {
		const { container } = render(<DirectionAwareHover imageUrl="/test.jpg" />);
		const figure = container.querySelector('[role="figure"]') as HTMLElement;
		expect(figure?.className).toContain("overflow-hidden");
	});

	it("has rounded-lg class on the container", () => {
		const { container } = render(<DirectionAwareHover imageUrl="/test.jpg" />);
		const figure = container.querySelector('[role="figure"]') as HTMLElement;
		expect(figure?.className).toContain("rounded-lg");
	});

	it("carries the port-added CSS anchor class on the container", () => {
		const { container } = render(<DirectionAwareHover imageUrl="/test.jpg" />);
		const figure = container.querySelector('[role="figure"]') as HTMLElement;
		expect(figure?.classList.contains("direction-aware-hover")).toBe(true);
		// The named group is still there: the overlay's group-hover/card: variants depend on it.
		expect(figure?.classList.contains("group/card")).toBe(true);
	});

	it("applies custom class names", () => {
		const { container } = render(
			<DirectionAwareHover imageUrl="/test.jpg" className="custom-hover" />
		);
		const figure = container.querySelector('[role="figure"]') as HTMLElement;
		expect(figure?.className).toContain("custom-hover");
	});

	it("image has object-cover class", () => {
		const { container } = render(<DirectionAwareHover imageUrl="/test.jpg" />);
		const img = container.querySelector("img");
		expect(img?.className).toContain("object-cover");
	});

	describe("keyboard path", () => {
		const overlay = (c: HTMLElement) => c.querySelector(".bg-black\\/40");

		function pointer(type: string, el: Element, pointerType: string) {
			fireEvent(el, Object.assign(new Event(type, { bubbles: true }), { pointerType }));
		}

		it("makes the root focusable", () => {
			const { container } = render(<DirectionAwareHover imageUrl="/t.jpg" />);
			expect(container.querySelector('[role="figure"]')).toHaveAttribute("tabindex", "0");
		});

		it("focus presents the overlay, blur returns to rest", () => {
			const { container } = render(<DirectionAwareHover imageUrl="/t.jpg" />);
			const figure = container.querySelector('[role="figure"]') as HTMLElement;
			expect(overlay(container)).toBeNull();
			act(() => figure.focus());
			const el = overlay(container);
			expect(el).not.toBeNull();
			expect(el!.className).toContain("-translate-y-full");
			expect(el!.className).toContain("group-focus-within/card:translate-y-0");
			const img = figure.querySelector("img")!.parentElement as HTMLElement;
			expect(img.className).toContain("translate-y-2");
			act(() => figure.blur());
			expect(img.className).not.toContain("translate-y-2");
		});

		it("ignores touch pointers on the hover path", () => {
			// jsdom reports touch support, which would switch the hover path off for every pointer.
			delete (window as unknown as Record<string, unknown>).ontouchstart;
			const { container } = render(<DirectionAwareHover imageUrl="/t.jpg" />);
			const figure = container.querySelector('[role="figure"]') as HTMLElement;
			pointer("pointerover", figure, "touch");
			expect(overlay(container)).toBeNull();
			pointer("pointerover", figure, "mouse");
			expect(overlay(container)).not.toBeNull();
		});
	});
});
