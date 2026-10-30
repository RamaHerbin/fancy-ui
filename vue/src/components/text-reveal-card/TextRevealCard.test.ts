import { render, cleanup, fireEvent } from "@testing-library/vue";
import { nextTick } from "vue";
import { afterEach, describe, it, expect } from "vitest";
import TextRevealCard from "./TextRevealCard.vue";

/** jsdom ships no PointerEvent: a mouse event of the pointer type carries `pointerType`. */
function firePointer(
	el: Element,
	type: string,
	init: { clientX?: number; pointerType?: string } = {}
) {
	const event = new MouseEvent(type, {
		bubbles: !/enter|leave/.test(type),
		clientX: init.clientX,
	});
	Object.defineProperty(event, "pointerType", { value: init.pointerType ?? "mouse" });
	el.dispatchEvent(event);
}

/** Keyboard focus as the browser reports it: the card matches `:focus-visible`. */
function asKeyboardFocus(card: HTMLElement) {
	card.matches = ((selector: string) => selector === ":focus-visible") as typeof card.matches;
}

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

	it("a touch pointer does not scrub, a mouse pointer does", async () => {
		const { container } = render(TextRevealCard);
		const card = container.firstElementChild as HTMLElement;
		const layer = container.querySelector(".z-20") as HTMLElement;
		card.getBoundingClientRect = () => ({ left: 0, width: 200 }) as DOMRect;
		firePointer(card, "pointerenter", { pointerType: "touch" });
		firePointer(card, "pointermove", { clientX: 100, pointerType: "touch" });
		await nextTick();
		expect(layer.style.opacity).toBe("0");
		expect(layer.classList.contains("text-reveal-settle")).toBe(true);
		firePointer(card, "pointerenter", { pointerType: "mouse" });
		firePointer(card, "pointermove", { clientX: 100, pointerType: "mouse" });
		await nextTick();
		expect(layer.style.opacity).toBe("1");
		expect(layer.style.clipPath).toBe("inset(0 50% 0 0)");
	});

	describe("keyboard path", () => {
		it("stays revealed after the pointer leaves when keyboard focus arrived under it", async () => {
			const { container } = render(TextRevealCard);
			const card = container.firstElementChild as HTMLElement;
			const layer = container.querySelector(".z-20") as HTMLElement;
			asKeyboardFocus(card);
			firePointer(card, "pointerenter");
			await fireEvent.focusIn(card);
			firePointer(card, "pointerleave");
			await new Promise((resolve) => setTimeout(resolve, 150));
			await nextTick();
			expect(layer.style.opacity).toBe("1");
			await fireEvent.focusOut(card);
			expect(layer.style.opacity).toBe("0");
		});

		it("keyboard focus under a resting pointer reveals the full text at once", async () => {
			const { container } = render(TextRevealCard);
			const card = container.firstElementChild as HTMLElement;
			const layer = container.querySelector(".z-20") as HTMLElement;
			asKeyboardFocus(card);
			firePointer(card, "pointerenter");
			await fireEvent.focusIn(card);
			expect(layer.style.opacity).toBe("1");
			expect(layer.style.clipPath).toContain("inset(0 0%");
		});

		it("a tap's focus does not lock the reveal open", async () => {
			const { container } = render(TextRevealCard);
			const card = container.firstElementChild as HTMLElement;
			const layer = container.querySelector(".z-20") as HTMLElement;
			card.matches = (() => false) as typeof card.matches;
			await fireEvent.touchStart(card);
			await fireEvent.touchEnd(card);
			await fireEvent.focusIn(card);
			await new Promise((resolve) => setTimeout(resolve, 150));
			await nextTick();
			expect(layer.style.opacity).toBe("0");
		});

		it("is focusable", () => {
			const { container } = render(TextRevealCard);
			expect(container.firstElementChild).toHaveAttribute("tabindex", "0");
		});

		it("focus reveals the full text, Escape returns to rest", async () => {
			const { container } = render(TextRevealCard);
			const card = container.firstElementChild as HTMLElement;
			const layer = container.querySelector(".z-20") as HTMLElement;
			asKeyboardFocus(card);
			await fireEvent.focusIn(card);
			expect(layer.style.opacity).toBe("1");
			expect(layer.style.clipPath).toContain("inset(0 0%");
			await fireEvent.keyDown(card, { key: "Escape" });
			expect(layer.style.opacity).toBe("0");
		});

		it("blur returns to rest", async () => {
			const { container } = render(TextRevealCard);
			const card = container.firstElementChild as HTMLElement;
			const layer = container.querySelector(".z-20") as HTMLElement;
			asKeyboardFocus(card);
			await fireEvent.focusIn(card);
			expect(layer.style.opacity).toBe("1");
			await fireEvent.focusOut(card);
			expect(layer.style.opacity).toBe("0");
		});
	});
});
