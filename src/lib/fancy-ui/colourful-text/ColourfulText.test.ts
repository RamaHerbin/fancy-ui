import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import ColourfulText from "./ColourfulText.svelte";

describe("ColourfulText", () => {
	afterEach(cleanup);

	it("renders one span per character", () => {
		const { container } = render(ColourfulText, { props: { text: "Hello" } });
		const chars = container.querySelectorAll(".colourful-char");
		expect(chars.length).toBe(5);
	});

	it("renders the correct text content", () => {
		const { container } = render(ColourfulText, { props: { text: "ABC" } });
		const wrapper = container.querySelector(".colourful-text");
		expect(wrapper?.textContent).toBe("ABC");
	});

	it("renders spaces as non-breaking spaces", () => {
		const { container } = render(ColourfulText, { props: { text: "A B" } });
		const chars = container.querySelectorAll(".colourful-char");
		expect(chars.length).toBe(3);
		expect(chars[1].textContent).toBe("\u00A0");
	});

	it("applies color styles to each character", () => {
		const { container } = render(ColourfulText, { props: { text: "Hi" } });
		const chars = container.querySelectorAll(".colourful-char");
		chars.forEach((char) => {
			const style = (char as HTMLElement).getAttribute("style") ?? "";
			expect(style).toContain("color:");
			expect(style).toContain("transition:");
		});
	});

	it("applies staggered transition delays", () => {
		const { container } = render(ColourfulText, {
			props: { text: "AB", duration: 0.5 },
		});
		const chars = container.querySelectorAll(".colourful-char");
		const style0 = (chars[0] as HTMLElement).getAttribute("style") ?? "";
		const style1 = (chars[1] as HTMLElement).getAttribute("style") ?? "";
		expect(style0).toContain("0s");
		expect(style1).toContain("0.05s");
	});

	it("applies custom class names", () => {
		const { container } = render(ColourfulText, {
			props: { text: "Hi", class: "my-colourful" },
		});
		const wrapper = container.querySelector(".colourful-text");
		expect(wrapper?.className).toContain("my-colourful");
	});

	it("renders an empty wrapper for empty text", () => {
		const { container } = render(ColourfulText, { props: { text: "" } });
		const chars = container.querySelectorAll(".colourful-char");
		expect(chars.length).toBe(0);
	});
});
