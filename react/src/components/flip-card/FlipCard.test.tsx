import { render, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { FlipCard, flipDirection, showsBack } from "./FlipCard.js";

/**
 * jsdom does not implement `PointerEvent`; without it `fireEvent.pointerEnter`
 * falls back to a plain `Event` and drops `clientX`/`pointerType`. Extending
 * `MouseEvent` keeps the coordinates. Test-only, installed only when missing.
 */
class PointerEventPolyfill extends MouseEvent {
	readonly pointerId: number;
	readonly pointerType: string;
	readonly isPrimary: boolean;

	constructor(type: string, init: PointerEventInit = {}) {
		super(type, init);
		this.pointerId = init.pointerId ?? 0;
		this.pointerType = init.pointerType ?? "";
		this.isPrimary = init.isPrimary ?? false;
	}
}

if (typeof window.PointerEvent === "undefined") {
	Object.defineProperty(window, "PointerEvent", {
		writable: true,
		configurable: true,
		value: PointerEventPolyfill,
	});
}

function card(container: HTMLElement) {
	return container.querySelector(".ft-flip-card") as HTMLDivElement;
}
function front(container: HTMLElement) {
	return container.querySelector(".ft-flip-card__front") as HTMLDivElement;
}
function backFace(container: HTMLElement) {
	return container.querySelector(".ft-flip-card__back") as HTMLDivElement;
}
/** jsdom has no `inert` property to reflect, so check the attribute or the property. */
function isInert(el: HTMLElement) {
	return el.hasAttribute("inert") || (el as HTMLElement & { inert?: boolean }).inert === true;
}
function target(container: HTMLElement) {
	return Number(card(container).style.getPropertyValue("--fc-target").replace("deg", ""));
}

describe("FlipCard", () => {
	afterEach(cleanup);

	it("renders front and back faces with perspective, and merges class", () => {
		const { container } = render(<FlipCard className="my-card" />);
		const root = card(container);
		expect(root.className).toContain("[perspective:1000px]");
		expect(root.className).toContain("my-card");
		expect(front(container)).toBeInTheDocument();
		expect(backFace(container)).toBeInTheDocument();
	});

	it("records the axis for the CSS", () => {
		expect(card(render(<FlipCard />).container).dataset.axis).toBe("y");
		cleanup();
		expect(card(render(<FlipCard rotate="x" />).container).dataset.axis).toBe("x");
	});

	it("hides the face that is turned away from assistive tech and focus", () => {
		const { container } = render(<FlipCard back={<p>Back</p>}>{<p>Front</p>}</FlipCard>);
		expect(isInert(front(container))).toBe(false);
		expect(isInert(backFace(container))).toBe(true);
		expect(backFace(container).getAttribute("aria-hidden")).toBe("true");
	});

	it("starts on the back when flipped is set, with no animation to get there", () => {
		const onFlip = vi.fn();
		const { container } = render(<FlipCard flipped onFlip={onFlip} />);
		expect(target(container)).toBe(180);
		expect(card(container).hasAttribute("data-flipped")).toBe(true);
		expect(isInert(front(container))).toBe(true);
		expect(onFlip).not.toHaveBeenCalled();
	});

	it("click mode: a toggle button that keeps turning the same way", () => {
		const onFlip = vi.fn();
		const { container } = render(<FlipCard trigger="click" onFlip={onFlip} label="Card" />);
		const root = card(container);
		expect(root.getAttribute("role")).toBe("button");
		expect(root.getAttribute("aria-pressed")).toBe("false");
		expect(root.getAttribute("aria-label")).toBe("Card");

		fireEvent.click(root);
		expect(target(container)).toBe(180);
		expect(root.getAttribute("aria-pressed")).toBe("true");
		fireEvent.click(root);
		// continues to a full turn rather than rewinding to 0
		expect(target(container)).toBe(360);
		expect(root.getAttribute("aria-pressed")).toBe("false");
		expect(onFlip.mock.calls).toEqual([[true], [false]]);
	});

	it("click mode: Enter and Space flip, other keys do not", () => {
		const { container } = render(<FlipCard trigger="click" />);
		const root = card(container);
		fireEvent.keyDown(root, { key: "Enter" });
		expect(target(container)).toBe(180);
		fireEvent.keyDown(root, { key: " " });
		expect(target(container)).toBe(360);
		fireEvent.keyDown(root, { key: "a" });
		expect(target(container)).toBe(360);
	});

	it("click mode: a link or button inside a face keeps its own click", () => {
		const { container } = render(
			<FlipCard trigger="click">
				<div>
					<a href="#x">Link</a>
				</div>
			</FlipCard>
		);
		fireEvent.click(container.querySelector("a")!);
		expect(target(container)).toBe(0);
	});

	it("hover mode: turns toward the side the pointer travels, and back on leave", () => {
		const { container } = render(<FlipCard />);
		const root = card(container);
		root.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 300 }) as DOMRect;
		// enters from the left: travelling right, positive turn
		fireEvent.pointerEnter(root, { clientX: 5, clientY: 150, pointerType: "mouse" });
		expect(target(container)).toBe(180);
		// leaves through the right: still travelling right, keeps turning
		fireEvent.pointerLeave(root, { clientX: 195, clientY: 150, pointerType: "mouse" });
		expect(target(container)).toBe(360);
	});

	it("hover mode: keyboard focus flips to the back and blur flips it home", () => {
		const { container } = render(<FlipCard />);
		const root = card(container);
		expect(root.getAttribute("tabindex")).toBe("0");
		fireEvent.focus(root);
		expect(card(container).hasAttribute("data-flipped")).toBe(true);
		fireEvent.blur(root);
		expect(card(container).hasAttribute("data-flipped")).toBe(false);
	});

	it("follows a flipped prop changed from outside", () => {
		const onFlip = vi.fn();
		const { container, rerender } = render(<FlipCard flipped={false} onFlip={onFlip} />);
		rerender(<FlipCard flipped onFlip={onFlip} />);
		expect(card(container).hasAttribute("data-flipped")).toBe(true);
		expect(target(container)).toBe(180);
		expect(onFlip.mock.calls).toEqual([[true]]);
	});

	it("renders the light layer on both faces only when glare is on", () => {
		const on = render(<FlipCard />);
		expect(on.container.querySelectorAll(".ft-flip-card__light")).toHaveLength(2);
		cleanup();
		const off = render(<FlipCard glare={false} />);
		expect(off.container.querySelectorAll(".ft-flip-card__light")).toHaveLength(0);
	});
});

describe("flip helpers", () => {
	it("reads the showing face from an accumulated angle", () => {
		expect(showsBack(0)).toBe(false);
		expect(showsBack(180)).toBe(true);
		expect(showsBack(-180)).toBe(true);
		expect(showsBack(360)).toBe(false);
		expect(showsBack(540)).toBe(true);
	});

	it("turns the way the pointer travels, on both axes", () => {
		const rect = { left: 0, top: 0, width: 200, height: 300 };
		expect(flipDirection(rect, { x: 10, y: 150 }, "y", true)).toBe(1); // in from the left
		expect(flipDirection(rect, { x: 190, y: 150 }, "y", true)).toBe(-1); // in from the right
		expect(flipDirection(rect, { x: 190, y: 150 }, "y", false)).toBe(1); // out the right
		expect(flipDirection(rect, { x: 100, y: 10 }, "x", true)).toBe(-1); // in from the top
		expect(flipDirection(rect, { x: 100, y: 290 }, "x", true)).toBe(1); // in from the bottom
	});
});
