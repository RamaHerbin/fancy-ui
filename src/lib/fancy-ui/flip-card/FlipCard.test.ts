import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet, flushSync, tick } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import FlipCard, { flipDirection, showsBack } from "./FlipCard.svelte";

const snippet = (html: string) => createRawSnippet(() => ({ render: () => html }));

function card(container: HTMLElement) {
	return container.querySelector(".ft-flip-card") as HTMLDivElement;
}
function front(container: HTMLElement) {
	return container.querySelector(".ft-flip-card__front") as HTMLDivElement;
}
function backFace(container: HTMLElement) {
	return container.querySelector(".ft-flip-card__back") as HTMLDivElement;
}
/** jsdom has no `inert` property to reflect, so Svelte's write may land on either. */
function isInert(el: HTMLElement) {
	return el.hasAttribute("inert") || (el as HTMLElement & { inert?: boolean }).inert === true;
}
function target(container: HTMLElement) {
	return Number(card(container).style.getPropertyValue("--fc-target").replace("deg", ""));
}

describe("FlipCard", () => {
	afterEach(cleanup);

	it("renders front and back faces with perspective, and merges class", () => {
		const { container } = render(FlipCard, { props: { class: "my-card" } });
		const root = card(container);
		expect(root.className).toContain("[perspective:1000px]");
		expect(root.className).toContain("my-card");
		expect(front(container)).toBeInTheDocument();
		expect(backFace(container)).toBeInTheDocument();
	});

	it("records the axis for the CSS", () => {
		expect(card(render(FlipCard).container).dataset.axis).toBe("y");
		cleanup();
		expect(card(render(FlipCard, { props: { rotate: "x" } }).container).dataset.axis).toBe("x");
	});

	it("hides the face that is turned away from assistive tech and focus", () => {
		const { container } = render(FlipCard, {
			props: { children: snippet("<p>Front</p>"), back: snippet("<p>Back</p>") },
		});
		expect(isInert(front(container))).toBe(false);
		expect(isInert(backFace(container))).toBe(true);
		expect(backFace(container).getAttribute("aria-hidden")).toBe("true");
	});

	it("starts on the back when flipped is set, with no animation to get there", () => {
		const { container } = render(FlipCard, { props: { flipped: true } });
		expect(target(container)).toBe(180);
		expect(card(container).hasAttribute("data-flipped")).toBe(true);
		expect(isInert(front(container))).toBe(true);
	});

	it("click mode: a toggle button that keeps turning the same way", async () => {
		const onflip = vi.fn();
		const { container } = render(FlipCard, { props: { trigger: "click", onflip, label: "Card" } });
		const root = card(container);
		expect(root.getAttribute("role")).toBe("button");
		expect(root.getAttribute("aria-pressed")).toBe("false");
		expect(root.getAttribute("aria-label")).toBe("Card");

		await fireEvent.click(root);
		expect(target(container)).toBe(180);
		expect(root.getAttribute("aria-pressed")).toBe("true");
		await fireEvent.click(root);
		// continues to a full turn rather than rewinding to 0
		expect(target(container)).toBe(360);
		expect(root.getAttribute("aria-pressed")).toBe("false");
		expect(onflip.mock.calls).toEqual([[true], [false]]);
	});

	it("click mode: Enter and Space flip, other keys do not", async () => {
		const { container } = render(FlipCard, { props: { trigger: "click" } });
		const root = card(container);
		await fireEvent.keyDown(root, { key: "Enter" });
		expect(target(container)).toBe(180);
		await fireEvent.keyDown(root, { key: " " });
		expect(target(container)).toBe(360);
		await fireEvent.keyDown(root, { key: "a" });
		expect(target(container)).toBe(360);
	});

	it("click mode: a link or button inside a face keeps its own click", async () => {
		const { container } = render(FlipCard, {
			props: { trigger: "click", children: snippet('<div><a href="#x">Link</a></div>') },
		});
		await fireEvent.click(container.querySelector("a")!);
		expect(target(container)).toBe(0);
	});

	it("hover mode: turns toward the side the pointer travels, and back on leave", async () => {
		const { container } = render(FlipCard);
		const root = card(container);
		root.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 300 }) as DOMRect;
		// enters from the left: travelling right, positive turn
		await fireEvent.pointerEnter(root, { clientX: 5, clientY: 150, pointerType: "mouse" });
		expect(target(container)).toBe(180);
		// leaves through the right: still travelling right, keeps turning
		await fireEvent.pointerLeave(root, { clientX: 195, clientY: 150, pointerType: "mouse" });
		expect(target(container)).toBe(360);
	});

	it("hover mode: keyboard focus flips to the back and blur flips it home", async () => {
		const { container } = render(FlipCard);
		const root = card(container);
		expect(root.getAttribute("tabindex")).toBe("0");
		await fireEvent.focus(root);
		expect(card(container).hasAttribute("data-flipped")).toBe(true);
		await fireEvent.blur(root);
		expect(card(container).hasAttribute("data-flipped")).toBe(false);
	});

	it("follows a flipped prop changed from outside", async () => {
		const { container, rerender } = render(FlipCard, { props: { flipped: false } });
		await rerender({ flipped: true });
		flushSync();
		await tick();
		expect(card(container).hasAttribute("data-flipped")).toBe(true);
		expect(target(container)).toBe(180);
	});

	it("renders the light layer on both faces only when glare is on", () => {
		const on = render(FlipCard);
		expect(on.container.querySelectorAll(".ft-flip-card__light")).toHaveLength(2);
		cleanup();
		const off = render(FlipCard, { props: { glare: false } });
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
