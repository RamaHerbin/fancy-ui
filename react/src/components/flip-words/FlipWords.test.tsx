import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { FlipWords } from "./FlipWords.js";

describe("FlipWords", () => {
	afterEach(cleanup);

	it("renders the first word initially", () => {
		const { container } = render(<FlipWords words={["Hello", "World"]} />);
		const wordSpans = container.querySelectorAll(".flip-words-word");
		expect(wordSpans.length).toBeGreaterThan(0);
		const text = container.querySelector(".flip-words")?.textContent?.trim();
		expect(text).toContain("Hello");
	});

	it("renders letters individually with animation", () => {
		const { container } = render(<FlipWords words={["ABC"]} />);
		const wrapper = container.querySelector(".flip-words-enter");
		expect(wrapper).toBeTruthy();
		// ABC = 3 letters inside word span
		expect(wrapper?.textContent).toContain("ABC");
	});

	it("applies custom class name", () => {
		const { container } = render(<FlipWords words={["Test"]} className="my-custom" />);
		const inner = container.querySelector(".flip-words-enter");
		expect(inner?.className).toContain("my-custom");
	});

	it("has animation styles on word spans", () => {
		const { container } = render(<FlipWords words={["Hello World"]} />);
		const wordSpans = container.querySelectorAll(".flip-words-word");
		wordSpans.forEach((span) => {
			const style = (span as HTMLElement).getAttribute("style") ?? "";
			expect(style).toContain("animation");
			expect(style).toContain("flipFadeInWord");
		});
	});

	it("renders multiple words in a phrase with spaces", () => {
		const { container } = render(<FlipWords words={["Hello World"]} />);
		const wordSpans = container.querySelectorAll(".flip-words-word");
		// "Hello World" split by space = 2 word groups
		expect(wordSpans.length).toBe(2);
	});
});
