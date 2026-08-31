import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { AnimatedLogoCloud } from "./index.js";

const mockLogos = [
	{ name: "Svelte", path: "/svelte.svg" },
	{ name: "React", path: "/react.svg" },
];

describe("AnimatedLogoCloud", () => {
	afterEach(cleanup);

	it("renders a container div", () => {
		const { container } = render(<AnimatedLogoCloud logos={mockLogos} />);
		const mask = container.querySelector(".logo-cloud-mask");
		expect(mask).toBeInTheDocument();
	});

	it("renders 5 scroll groups", () => {
		const { container } = render(<AnimatedLogoCloud logos={mockLogos} />);
		const scrolls = container.querySelectorAll(".logo-cloud-scroll");
		expect(scrolls.length).toBe(5);
	});

	it("renders correct number of logo images per group", () => {
		const { container } = render(<AnimatedLogoCloud logos={mockLogos} />);
		const firstGroup = container.querySelector(".logo-cloud-scroll");
		const imgs = firstGroup?.querySelectorAll("img");
		expect(imgs?.length).toBe(2);
	});

	it("sets correct alt on logo images", () => {
		const { container } = render(<AnimatedLogoCloud logos={mockLogos} />);
		const img = container.querySelector("img");
		expect(img).toHaveAttribute("alt", "Svelte");
	});

	it("renders title when provided", () => {
		const { container } = render(<AnimatedLogoCloud logos={mockLogos} title="Our Partners" />);
		expect(container.textContent).toContain("Our Partners");
	});

	it("does not render title when not provided", () => {
		const { container } = render(<AnimatedLogoCloud logos={mockLogos} />);
		const titleDiv = container.querySelector(".text-center");
		expect(titleDiv).not.toBeInTheDocument();
	});

	it("applies custom class names", () => {
		const { container } = render(<AnimatedLogoCloud logos={mockLogos} className="custom-cloud" />);
		const mask = container.querySelector(".logo-cloud-mask");
		expect(mask?.className).toContain("custom-cloud");
	});
});
