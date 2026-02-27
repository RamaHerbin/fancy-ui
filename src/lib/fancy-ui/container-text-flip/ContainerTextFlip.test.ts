import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import ContainerTextFlip from "./ContainerTextFlip.svelte";

describe("ContainerTextFlip", () => {
	afterEach(cleanup);

	it("renders the component", () => {
		const { container } = render(ContainerTextFlip);
		const el = container.querySelector("p");
		expect(el).toBeInTheDocument();
	});

	it("renders first word by default", () => {
		const { container } = render(ContainerTextFlip, {
			props: { words: ["hello", "world"] },
		});
		const letters = container.querySelectorAll(".text-flip-letter");
		const text = Array.from(letters)
			.map((l) => l.textContent)
			.join("");
		expect(text).toBe("hello");
	});

	it("applies custom class", () => {
		const { container } = render(ContainerTextFlip, {
			props: { class: "my-flip" },
		});
		const el = container.querySelector("p");
		expect(el?.className).toContain("my-flip");
	});

	it("renders letters with staggered animation delay", () => {
		const { container } = render(ContainerTextFlip, {
			props: { words: ["abc"] },
		});
		const letters = container.querySelectorAll(".text-flip-letter");
		expect(letters.length).toBe(3);
		const firstDelay = (letters[0] as HTMLElement).style.animationDelay;
		const secondDelay = (letters[1] as HTMLElement).style.animationDelay;
		expect(firstDelay).toBe("0s");
		expect(secondDelay).toBe("0.02s");
	});

	it("applies custom animation duration", () => {
		const { container } = render(ContainerTextFlip, {
			props: { words: ["hi"], animationDuration: 500 },
		});
		const letter = container.querySelector(".text-flip-letter") as HTMLElement;
		expect(letter.style.animationDuration).toBe("500ms");
	});
});
