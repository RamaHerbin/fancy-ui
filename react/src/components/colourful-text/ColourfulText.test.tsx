import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { ColourfulText } from "./ColourfulText.js";

describe("ColourfulText", () => {
	afterEach(cleanup);

	it("renders one span per character", () => {
		const { container } = render(<ColourfulText text="Hello" />);
		const chars = container.querySelectorAll(".colourful-char");
		expect(chars.length).toBe(5);
	});

	it("renders the correct text content", () => {
		const { container } = render(<ColourfulText text="ABC" />);
		const wrapper = container.querySelector(".colourful-text");
		expect(wrapper?.textContent).toBe("ABC");
	});

	it("renders spaces as non-breaking spaces", () => {
		const { container } = render(<ColourfulText text="A B" />);
		const chars = container.querySelectorAll(".colourful-char");
		expect(chars.length).toBe(3);
		expect(chars[1]?.textContent).toBe("\u00A0");
	});

	it("applies color styles to each character", () => {
		const { container } = render(<ColourfulText text="Hi" />);
		const chars = container.querySelectorAll(".colourful-char");
		chars.forEach((char) => {
			const style = (char as HTMLElement).getAttribute("style") ?? "";
			expect(style).toContain("color:");
			expect(style).toContain("transition:");
		});
	});

	it("applies staggered transition delays", () => {
		const { container } = render(<ColourfulText text="AB" duration={0.5} />);
		const chars = container.querySelectorAll(".colourful-char");
		const style0 = (chars[0] as HTMLElement).getAttribute("style") ?? "";
		const style1 = (chars[1] as HTMLElement).getAttribute("style") ?? "";
		expect(style0).toContain("0s");
		expect(style1).toContain("0.05s");
	});

	it("applies custom class names", () => {
		const { container } = render(<ColourfulText text="Hi" className="my-colourful" />);
		const wrapper = container.querySelector(".colourful-text");
		expect(wrapper?.className).toContain("my-colourful");
	});

	// Port-only: the seed contract. Fisher-Yates draws a fixed count in a fixed
	// order, so this permutation is the same on every JS engine — which is what
	// keeps a server render and its hydration in agreement. A comparator shuffle
	// would deal a different order per engine and fail this on some of them.
	it("deals an engine-independent colour order for a given seed", () => {
		const { container } = render(<ColourfulText text="abcd" seed={1} />);
		const chars = container.querySelectorAll<HTMLElement>(".colourful-char");
		expect(Array.from(chars, (char) => char.style.color)).toEqual([
			"rgb(230, 64, 92)",
			"rgb(232, 98, 63)",
			"rgb(4, 112, 202)",
			"rgb(42, 169, 210)",
		]);
	});

	it("shuffles the palette without losing or duplicating a colour", () => {
		const colors = ["rgb(1, 0, 0)", "rgb(2, 0, 0)", "rgb(3, 0, 0)", "rgb(4, 0, 0)"];
		const { container } = render(<ColourfulText text="wxyz" colors={colors} />);
		const chars = container.querySelectorAll<HTMLElement>(".colourful-char");
		expect(Array.from(chars, (char) => char.style.color).sort()).toEqual([...colors].sort());
	});

	it("renders an empty wrapper for empty text", () => {
		const { container } = render(<ColourfulText text="" />);
		const chars = container.querySelectorAll(".colourful-char");
		expect(chars.length).toBe(0);
	});
});
