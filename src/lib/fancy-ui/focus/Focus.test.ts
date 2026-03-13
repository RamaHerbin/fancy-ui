import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import Focus from "./Focus.svelte";

describe("Focus", () => {
	afterEach(cleanup);

	it("renders the component", () => {
		const { container } = render(Focus);
		const wrapper = container.querySelector(".focus-container");
		expect(wrapper).toBeInTheDocument();
	});

	it("splits sentence into words", () => {
		const { container } = render(Focus, {
			props: { sentence: "Hello World Test" },
		});
		const words = container.querySelectorAll(".focus-word");
		expect(words.length).toBe(3);
	});

	it("renders default sentence", () => {
		const { container } = render(Focus);
		const words = container.querySelectorAll(".focus-word");
		expect(words.length).toBe(2); // "Fancy" "Focus"
	});

	it("renders focus frame with corners", () => {
		const { container } = render(Focus);
		const frame = container.querySelector(".focus-frame");
		expect(frame).toBeInTheDocument();
		const corners = container.querySelectorAll(".corner");
		expect(corners.length).toBe(4);
	});

	it("applies custom border color", () => {
		const { container } = render(Focus, { props: { borderColor: "red" } });
		const word = container.querySelector(".focus-word") as HTMLElement;
		expect(word.style.getPropertyValue("--border-color")).toBe("red");
	});

	it("applies custom class", () => {
		const { container } = render(Focus, { props: { class: "my-focus" } });
		const wrapper = container.querySelector(".focus-container");
		expect(wrapper?.className).toContain("my-focus");
	});

	it("blurs non-active words", () => {
		const { container } = render(Focus, {
			props: { sentence: "A B", blurAmount: 8 },
		});
		const words = container.querySelectorAll(".focus-word");
		// Second word should be blurred
		expect((words[1] as HTMLElement).style.filter).toBe("blur(8px)");
	});
});
