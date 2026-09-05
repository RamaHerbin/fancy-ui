import { render, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { InteractiveGridPattern } from "./InteractiveGridPattern.js";

/* Counts cn() evaluations so a hover can be asserted to re-render only the squares
   whose fill changed, not the whole grid. */
const cnCalls = vi.hoisted(() => ({ count: 0 }));

vi.mock("../../utils.js", async () => {
	const actual = await vi.importActual<typeof import("../../utils.js")>("../../utils.js");
	return {
		...actual,
		cn: (...inputs: Parameters<typeof actual.cn>) => {
			cnCalls.count += 1;
			return actual.cn(...inputs);
		},
	};
});

describe("InteractiveGridPattern", () => {
	afterEach(cleanup);

	it("renders an SVG element", () => {
		const { container } = render(<InteractiveGridPattern squares={[3, 3]} />);
		const svg = container.querySelector("svg");
		expect(svg).toBeInTheDocument();
	});

	it("renders correct number of rect elements", () => {
		const { container } = render(<InteractiveGridPattern squares={[4, 3]} />);
		const rects = container.querySelectorAll("rect");
		expect(rects.length).toBe(12);
	});

	it("renders default 24x24 grid", () => {
		const { container } = render(<InteractiveGridPattern />);
		const rects = container.querySelectorAll("rect");
		expect(rects.length).toBe(576);
	});

	it("each rect has interactive-grid-square class", () => {
		const { container } = render(<InteractiveGridPattern squares={[2, 2]} />);
		const rects = container.querySelectorAll(".interactive-grid-square");
		expect(rects.length).toBe(4);
	});

	it("applies custom class names to SVG", () => {
		const { container } = render(
			<InteractiveGridPattern squares={[2, 2]} className="my-grid" />
		);
		const svg = container.querySelector("svg");
		expect(svg?.getAttribute("class")).toContain("my-grid");
	});

	it("sets correct SVG dimensions based on props", () => {
		const { container } = render(
			<InteractiveGridPattern squares={[5, 3]} width={50} height={30} />
		);
		const svg = container.querySelector("svg");
		expect(svg).toHaveAttribute("width", "250");
		expect(svg).toHaveAttribute("height", "90");
	});

	it("applies the default stroke class to rects", () => {
		const { container } = render(<InteractiveGridPattern squares={[2, 2]} />);
		const rect = container.querySelector("rect");
		expect(rect?.getAttribute("class")).toContain("stroke-gray-400/30");
	});

	it("applies a custom strokeClassName to rects", () => {
		const { container } = render(
			<InteractiveGridPattern squares={[2, 2]} strokeClassName="stroke-black/40" />
		);
		const rect = container.querySelector("rect");
		expect(rect?.getAttribute("class")).toContain("stroke-black/40");
		expect(rect?.getAttribute("class")).not.toContain("stroke-gray-400/30");
	});

	it("attaches mouseenter/mouseleave listeners by default (interactive)", async () => {
		const { container } = render(<InteractiveGridPattern squares={[2, 2]} />);
		const rect = container.querySelector("rect") as SVGRectElement;
		expect(rect.getAttribute("class")).toContain("fill-transparent");
		await fireEvent.mouseEnter(rect);
		expect(rect.getAttribute("class")).toContain("fill-gray-300/30");
		await fireEvent.mouseLeave(rect);
		expect(rect.getAttribute("class")).toContain("fill-transparent");
	});

	it("re-renders only the squares whose fill changed on hover", async () => {
		const { container } = render(<InteractiveGridPattern squares={[8, 8]} />);
		const rects = container.querySelectorAll("rect");
		expect(rects.length).toBe(64);
		const first = rects[0] as SVGRectElement;
		const sixth = rects[5] as SVGRectElement;

		cnCalls.count = 0;
		await fireEvent.mouseEnter(first);
		expect(first.getAttribute("class")).toContain("fill-gray-300/30");
		// the svg container plus the one square that flipped — never the whole grid
		expect(cnCalls.count).toBeLessThanOrEqual(4);

		cnCalls.count = 0;
		await fireEvent.mouseEnter(sixth);
		expect(first.getAttribute("class")).toContain("fill-transparent");
		expect(sixth.getAttribute("class")).toContain("fill-gray-300/30");
		// the svg container plus the two squares that flipped
		expect(cnCalls.count).toBeLessThanOrEqual(5);
	});

	it("does not change fill state on hover when interactive is false", async () => {
		const { container } = render(
			<InteractiveGridPattern squares={[2, 2]} interactive={false} />
		);
		const rect = container.querySelector("rect") as SVGRectElement;
		expect(rect.getAttribute("class")).toContain("fill-transparent");
		await fireEvent.mouseEnter(rect);
		expect(rect.getAttribute("class")).toContain("fill-transparent");
		expect(rect.getAttribute("class")).not.toContain("fill-gray-300/30");
	});
});
