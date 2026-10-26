import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { LetterPullup } from "./LetterPullup.js";

describe("LetterPullup", () => {
	afterEach(cleanup);

	it("renders one span per character", () => {
		const { container } = render(<LetterPullup words="Hello" />);
		const chars = container.querySelectorAll(".letter-pullup-char");
		expect(chars.length).toBe(5);
	});

	it("renders spaces as non-breaking spaces", () => {
		const { container } = render(<LetterPullup words="A B" />);
		const chars = container.querySelectorAll(".letter-pullup-char");
		expect(chars.length).toBe(3);
		expect(chars[1]?.innerHTML).toContain("&nbsp;");
	});

	it("applies staggered animation delays", () => {
		const { container } = render(<LetterPullup words="AB" delay={0.1} />);
		const chars = container.querySelectorAll(".letter-pullup-char");
		const delay = (i: number) =>
			(chars[i] as HTMLElement).style.getPropertyValue("--letter-pullup-delay");
		expect(delay(0)).toBe("0s");
		expect(delay(1)).toBe("0.1s");
	});

	it("applies custom class names", () => {
		const { container } = render(<LetterPullup words="Hi" className="my-pullup" />);
		const chars = container.querySelectorAll(".letter-pullup-char");
		chars.forEach((char) => {
			expect(char.className).toContain("my-pullup");
		});
	});

	it("keeps the motion out of inline styles", () => {
		const { container } = render(<LetterPullup words="X" />);
		const char = container.querySelector(".letter-pullup-char");
		const style = (char as HTMLElement).getAttribute("style") ?? "";
		expect(style).not.toContain("animation");
		expect(style).not.toContain("opacity");
	});

	it("renders correct text content", () => {
		const { container } = render(<LetterPullup words="Test" />);
		const wrapper = container.querySelector(".letter-pullup");
		expect(wrapper?.textContent).toContain("Test");
	});
});
