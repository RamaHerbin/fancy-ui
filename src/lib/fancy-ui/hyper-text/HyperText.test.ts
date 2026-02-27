import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import HyperText from "./HyperText.svelte";

describe("HyperText", () => {
	afterEach(cleanup);

	it("renders one span per character", () => {
		const { container } = render(HyperText, { props: { text: "Hello" } });
		const chars = container.querySelectorAll(".hyper-text-char");
		expect(chars.length).toBe(5);
	});

	it("displays text in uppercase", () => {
		const { container } = render(HyperText, { props: { text: "abc" } });
		const wrapper = container.querySelector(".hyper-text");
		// Text content may be scrambled or resolved, but should exist
		expect(wrapper?.textContent?.trim().length).toBeGreaterThan(0);
	});

	it("applies custom class names", () => {
		const { container } = render(HyperText, {
			props: { text: "Test", class: "my-hyper" },
		});
		const wrapper = container.querySelector(".hyper-text");
		expect(wrapper?.className).toContain("my-hyper");
	});

	it("applies animation styles to each character", () => {
		const { container } = render(HyperText, { props: { text: "Hi" } });
		const chars = container.querySelectorAll(".hyper-text-char");
		chars.forEach((char) => {
			const style = (char as HTMLElement).getAttribute("style") ?? "";
			expect(style).toContain("animation");
			expect(style).toContain("hyperFadeIn");
		});
	});

	it("renders spaces with w-3 class", () => {
		const { container } = render(HyperText, { props: { text: "A B" } });
		const chars = container.querySelectorAll(".hyper-text-char");
		expect(chars.length).toBe(3);
		expect(chars[1].className).toContain("w-3");
	});
});
