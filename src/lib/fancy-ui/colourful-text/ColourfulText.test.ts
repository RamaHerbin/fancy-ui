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
			const el = char as HTMLElement;
			expect(el.style.color).not.toBe("");
			expect(el.style.getPropertyValue("--ft-child-delay")).toMatch(/ms$/);
		});
	});

	it("applies staggered transition delays", () => {
		const { container } = render(ColourfulText, {
			props: { text: "AB", duration: 0.5 },
		});
		const chars = container.querySelectorAll(".colourful-char");
		expect((chars[0] as HTMLElement).style.getPropertyValue("--ft-child-delay")).toBe("0ms");
		expect((chars[1] as HTMLElement).style.getPropertyValue("--ft-child-delay")).toBe("50ms");
		const root = container.querySelector(".colourful-text") as HTMLElement;
		expect(root.style.getPropertyValue("--colourful-text-duration")).toBe("0.5s");
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
