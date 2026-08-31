import { render, cleanup } from "@testing-library/react";
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
});
