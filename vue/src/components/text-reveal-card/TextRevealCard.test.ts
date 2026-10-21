import { render, cleanup } from "@testing-library/vue";
import { afterEach, describe, it, expect } from "vitest";
import TextRevealCard from "./TextRevealCard.vue";

describe("TextRevealCard", () => {
	afterEach(cleanup);

	it("renders the component", () => {
		const { container } = render(TextRevealCard);
		const card = container.querySelector(".bg-\\[\\#1d1c20\\]");
		expect(card).toBeInTheDocument();
	});

	it("applies custom class", () => {
		const { container } = render(TextRevealCard, {
			props: { class: "my-reveal" },
		});
		const card = container.firstElementChild;
		expect(card?.className).toContain("my-reveal");
	});

	it("renders reveal line", () => {
		const { container } = render(TextRevealCard);
		const line = container.querySelector(".via-neutral-800");
		expect(line).toBeInTheDocument();
	});

	it("renders stars container", () => {
		const { container } = render(TextRevealCard);
		// Stars are rendered inside the component
		const starsContainer = container.querySelector(".absolute.inset-0");
		expect(starsContainer).toBeInTheDocument();
	});

	it("starts with 0% width", () => {
		const { container } = render(TextRevealCard);
		const revealLayer = container.querySelector(".z-20") as HTMLElement;
		expect(revealLayer?.style.opacity).toBe("0");
	});

	it("lets the page scroll vertically under a finger", () => {
		const { container } = render(TextRevealCard);
		const card = container.firstElementChild as HTMLElement;
		expect(card.className).toContain("touch-pan-y");
		expect(card.className).toContain("touch-pinch-zoom");
		const ev = new Event("touchmove", { bubbles: true, cancelable: true });
		Object.assign(ev, { touches: [{ clientX: 10, clientY: 10 }] });
		card.dispatchEvent(ev);
		expect(ev.defaultPrevented).toBe(false);
	});
});
