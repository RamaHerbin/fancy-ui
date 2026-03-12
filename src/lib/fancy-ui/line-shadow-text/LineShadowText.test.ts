import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import LineShadowText from "./LineShadowText.svelte";

describe("LineShadowText", () => {
	it("renders text content", () => {
		const { container } = render(LineShadowText, {
			props: { text: "Hello" },
		});
		expect(container.textContent).toContain("Hello");
	});

	it("sets data-text attribute for ::after content", () => {
		const { container } = render(LineShadowText, {
			props: { text: "Shadow" },
		});
		const el = container.firstElementChild as HTMLElement;
		expect(el.dataset.text).toBe("Shadow");
	});

	it("renders as span by default", () => {
		const { container } = render(LineShadowText, {
			props: { text: "Default" },
		});
		expect(container.querySelector("span")).toBeTruthy();
	});

	it("renders as custom element", () => {
		const { container } = render(LineShadowText, {
			props: { text: "Heading", as: "h1" },
		});
		expect(container.querySelector("h1")).toBeTruthy();
	});

	it("sets shadow color CSS variable", () => {
		const { container } = render(LineShadowText, {
			props: { text: "Colored", shadowColor: "red" },
		});
		const el = container.firstElementChild as HTMLElement;
		expect(el.style.getPropertyValue("--shadow-color")).toBe("red");
	});

	it("defaults shadow color to black", () => {
		const { container } = render(LineShadowText, {
			props: { text: "Default color" },
		});
		const el = container.firstElementChild as HTMLElement;
		expect(el.style.getPropertyValue("--shadow-color")).toBe("black");
	});

	it("applies custom class", () => {
		const { container } = render(LineShadowText, {
			props: { text: "Styled", class: "text-4xl font-bold" },
		});
		const el = container.firstElementChild as HTMLElement;
		expect(el.className).toContain("text-4xl");
		expect(el.className).toContain("font-bold");
	});

	it("has line-shadow-text class for animation", () => {
		const { container } = render(LineShadowText, {
			props: { text: "Animated" },
		});
		const el = container.firstElementChild as HTMLElement;
		expect(el.className).toContain("line-shadow-text");
	});
});
