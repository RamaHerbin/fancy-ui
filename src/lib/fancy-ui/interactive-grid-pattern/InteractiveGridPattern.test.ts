import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import InteractiveGridPattern from "./InteractiveGridPattern.svelte";

describe("InteractiveGridPattern", () => {
	afterEach(cleanup);

	it("renders an SVG element", () => {
		const { container } = render(InteractiveGridPattern, {
			props: { squares: [3, 3] },
		});
		const svg = container.querySelector("svg");
		expect(svg).toBeInTheDocument();
	});

	it("renders correct number of rect elements", () => {
		const { container } = render(InteractiveGridPattern, {
			props: { squares: [4, 3] },
		});
		const rects = container.querySelectorAll("rect");
		expect(rects.length).toBe(12);
	});

	it("renders default 24x24 grid", () => {
		const { container } = render(InteractiveGridPattern);
		const rects = container.querySelectorAll("rect");
		expect(rects.length).toBe(576);
	});

	it("each rect has interactive-grid-square class", () => {
		const { container } = render(InteractiveGridPattern, {
			props: { squares: [2, 2] },
		});
		const rects = container.querySelectorAll(".interactive-grid-square");
		expect(rects.length).toBe(4);
	});

	it("applies custom class names to SVG", () => {
		const { container } = render(InteractiveGridPattern, {
			props: { squares: [2, 2], class: "my-grid" },
		});
		const svg = container.querySelector("svg");
		expect(svg?.getAttribute("class")).toContain("my-grid");
	});

	it("sets correct SVG dimensions based on props", () => {
		const { container } = render(InteractiveGridPattern, {
			props: { squares: [5, 3], width: 50, height: 30 },
		});
		const svg = container.querySelector("svg");
		expect(svg).toHaveAttribute("width", "250");
		expect(svg).toHaveAttribute("height", "90");
	});
});
