import { render, cleanup, fireEvent, act } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { TextRevealCard } from "./TextRevealCard.js";

/** jsdom ships no PointerEvent: a mouse event of the pointer type carries `pointerType`.
    React derives enter/leave from over/out, so those are the types dispatched. */
function firePointer(
	el: Element,
	type: string,
	init: { clientX?: number; pointerType?: string } = {}
) {
	const event = new MouseEvent(type, { bubbles: true, clientX: init.clientX });
	Object.defineProperty(event, "pointerType", { value: init.pointerType ?? "mouse" });
	act(() => {
		el.dispatchEvent(event);
	});
}

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
			firePointer(card, "pointermove", { clientX });
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

	it("lets the page scroll vertically under a finger", () => {
		const { container } = render(<TextRevealCard />);
		const card = container.firstElementChild as HTMLElement;
		expect(card.className).toContain("touch-pan-y");
		expect(card.className).toContain("touch-pinch-zoom");
		const ev = new Event("touchmove", { bubbles: true, cancelable: true });
		Object.assign(ev, { touches: [{ clientX: 10, clientY: 10 }] });
		card.dispatchEvent(ev);
		expect(ev.defaultPrevented).toBe(false);
	});

	it("a touch pointer does not scrub, a mouse pointer does", () => {
		const { container } = render(<TextRevealCard />);
		const card = container.firstElementChild as HTMLElement;
		const layer = container.querySelector(".z-20") as HTMLElement;
		card.getBoundingClientRect = () => ({ left: 0, width: 200 }) as DOMRect;
		firePointer(card, "pointerover", { pointerType: "touch" });
		firePointer(card, "pointermove", { clientX: 100, pointerType: "touch" });
		expect(layer.style.opacity).toBe("0");
		expect(layer.classList.contains("text-reveal-settle")).toBe(true);
		firePointer(card, "pointerover", { pointerType: "mouse" });
		firePointer(card, "pointermove", { clientX: 100, pointerType: "mouse" });
		expect(layer.style.opacity).toBe("1");
		expect(layer.style.clipPath).toBe("inset(0 50% 0 0)");
	});

	describe("keyboard path", () => {
		it("is focusable", () => {
			const { container } = render(<TextRevealCard />);
			expect(container.firstElementChild).toHaveAttribute("tabindex", "0");
		});

		it("focus reveals the full text, Escape returns to rest", () => {
			const { container } = render(<TextRevealCard />);
			const card = container.firstElementChild as HTMLElement;
			const layer = container.querySelector(".z-20") as HTMLElement;
			act(() => card.focus());
			expect(layer.style.opacity).toBe("1");
			expect(layer.style.clipPath).toContain("inset(0 0%");
			fireEvent.keyDown(card, { key: "Escape" });
			expect(layer.style.opacity).toBe("0");
		});

		it("blur returns to rest", () => {
			const { container } = render(<TextRevealCard />);
			const card = container.firstElementChild as HTMLElement;
			const layer = container.querySelector(".z-20") as HTMLElement;
			act(() => card.focus());
			act(() => card.blur());
			expect(layer.style.opacity).toBe("0");
		});
	});
});
