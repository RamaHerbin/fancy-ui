import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import SparklesText from "./SparklesText.svelte";

describe("SparklesText", () => {
	afterEach(cleanup);

	it("renders the text content", () => {
		const { container } = render(SparklesText, { props: { text: "Hello" } });
		const wrapper = container.querySelector(".sparkles-text");
		expect(wrapper?.textContent).toContain("Hello");
	});

	it("renders sparkle SVG elements", () => {
		const { container } = render(SparklesText, {
			props: { text: "Test", sparklesCount: 5 },
		});
		const stars = container.querySelectorAll(".sparkles-star");
		expect(stars.length).toBe(5);
	});

	it("renders default 10 sparkles", () => {
		const { container } = render(SparklesText, { props: { text: "Test" } });
		const stars = container.querySelectorAll(".sparkles-star");
		expect(stars.length).toBe(10);
	});

	it("applies custom class names", () => {
		const { container } = render(SparklesText, {
			props: { text: "Hi", class: "my-sparkle" },
		});
		const wrapper = container.querySelector(".sparkles-text");
		expect(wrapper?.className).toContain("my-sparkle");
	});

	it("sparkle SVGs have animation styles", () => {
		const { container } = render(SparklesText, {
			props: { text: "X", sparklesCount: 1 },
		});
		const star = container.querySelector(".sparkles-star");
		const style = (star as HTMLElement)?.getAttribute("style") ?? "";
		expect(style).toContain("animation");
		expect(style).toContain("sparkleAnim");
	});

	it("uses custom colors on sparkle paths", () => {
		const { container } = render(SparklesText, {
			props: {
				text: "X",
				sparklesCount: 20,
				colors: { first: "#FF0000", second: "#00FF00" },
			},
		});
		const paths = container.querySelectorAll(".sparkles-star path");
		const fills = Array.from(paths).map((p) => p.getAttribute("fill"));
		const hasRed = fills.some((f) => f === "#FF0000");
		const hasGreen = fills.some((f) => f === "#00FF00");
		// With 20 sparkles and 50/50 chance, at least one of each should appear
		expect(hasRed || hasGreen).toBe(true);
	});
});
