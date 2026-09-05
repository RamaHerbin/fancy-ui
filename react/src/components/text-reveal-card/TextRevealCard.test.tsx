import { render, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { TextRevealCard } from "./TextRevealCard.js";

/* Counts cn() evaluations so a pointer scrub can be asserted to re-render the card
   alone, never the star field behind it. */
const cnCalls = vi.hoisted(() => ({ count: 0 }));

vi.mock("../../utils.js", async () => {
	const actual = await vi.importActual<typeof import("../../utils.js")>("../../utils.js");
	return {
		...actual,
		cn: (...inputs: Parameters<typeof actual.cn>) => {
			cnCalls.count += 1;
			return actual.cn(...inputs);
		},
	};
});

describe("TextRevealCard", () => {
	afterEach(cleanup);

	it("renders the component", () => {
		const { container } = render(<TextRevealCard />);
		const card = container.querySelector(".bg-\\[\\#1d1c20\\]");
		expect(card).toBeInTheDocument();
	});

	it("applies custom class", () => {
		const { container } = render(<TextRevealCard className="my-reveal" />);
		const card = container.firstElementChild;
		expect(card?.className).toContain("my-reveal");
	});

	it("renders reveal line", () => {
		const { container } = render(<TextRevealCard />);
		const line = container.querySelector(".via-neutral-800");
		expect(line).toBeInTheDocument();
	});

	it("renders stars container", () => {
		const { container } = render(<TextRevealCard />);
		// Stars are rendered inside the component
		const starsContainer = container.querySelector(".absolute.inset-0");
		expect(starsContainer).toBeInTheDocument();
	});

	it("does not re-render the star field while the pointer scrubs the card", () => {
		const starsCount = 12;
		const { container } = render(<TextRevealCard starsCount={starsCount} />);
		const card = container.firstElementChild as HTMLElement;
		card.getBoundingClientRect = () => ({ left: 0, width: 200 }) as DOMRect;
		expect(container.querySelectorAll(".star-animate").length).toBe(starsCount);

		cnCalls.count = 0;
		for (const clientX of [20, 40, 60, 80, 100]) {
			fireEvent.mouseMove(card, { clientX });
		}
		const revealLayer = container.querySelector(".z-20") as HTMLElement;
		expect(revealLayer.style.clipPath).toBe("inset(0 50% 0 0)");
		// one cn() per card render; the star field's starsCount calls stay out of it
		expect(cnCalls.count).toBeLessThanOrEqual(5);
	});

	it("starts with 0% width", () => {
		const { container } = render(<TextRevealCard />);
		const revealLayer = container.querySelector(".z-20") as HTMLElement;
		expect(revealLayer?.style.opacity).toBe("0");
	});
});
