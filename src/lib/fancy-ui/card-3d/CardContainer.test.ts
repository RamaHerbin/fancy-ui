import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, it, expect } from "vitest";
import CardContainer from "./CardContainer.svelte";
import CardBody from "./CardBody.svelte";
import CardItem from "./CardItem.svelte";

function textSnippet(html: string) {
	return createRawSnippet(() => ({ render: () => html }));
}

describe("CardContainer", () => {
	afterEach(cleanup);

	it("renders the perspective wrapper and the 3d inner container", () => {
		const { container } = render(CardContainer);
		const outer = container.firstElementChild as HTMLElement;
		const inner = outer.firstElementChild as HTMLElement;
		expect(outer.getAttribute("style")).toContain("perspective: 1000px");
		expect(inner.getAttribute("style")).toContain("transform-style: preserve-3d");
	});

	it("applies containerClass to the outer wrapper and class to the inner container", () => {
		const { container } = render(CardContainer, {
			props: { containerClass: "my-outer", class: "my-inner" },
		});
		const outer = container.firstElementChild as HTMLElement;
		const inner = outer.firstElementChild as HTMLElement;
		expect(outer.className).toContain("my-outer");
		expect(inner.className).toContain("my-inner");
	});

	it("renders children content", () => {
		const { container } = render(CardContainer, {
			props: { children: textSnippet("<p data-testid='content'>card body</p>") },
		});
		expect(container.querySelector("[data-testid='content']")?.textContent).toBe("card body");
	});

	it("rotates the inner container on mousemove and resets on mouseleave", async () => {
		const { container } = render(CardContainer);
		const inner = (container.firstElementChild as HTMLElement).firstElementChild as HTMLElement;

		// jsdom's getBoundingClientRect() is all zeros, so rotateY = clientX / 25
		// and rotateX = clientY / 25 for this component's handler.
		await fireEvent.mouseMove(inner, { clientX: 50, clientY: 25 });
		expect(inner.style.transform).toBe("rotateY(2deg) rotateX(1deg)");

		await fireEvent.mouseLeave(inner);
		expect(inner.style.transform).toBe("rotateY(0deg) rotateX(0deg)");
	});
});

describe("CardBody", () => {
	afterEach(cleanup);

	it("renders with the fixed 3d-card dimensions", () => {
		const { container } = render(CardBody);
		const body = container.firstElementChild as HTMLElement;
		expect(body.className).toContain("h-96");
		expect(body.className).toContain("w-96");
		expect(body.getAttribute("style")).toContain("transform-style: preserve-3d");
	});

	it("applies custom class names", () => {
		const { container } = render(CardBody, { props: { class: "my-body" } });
		const body = container.firstElementChild as HTMLElement;
		expect(body.className).toContain("my-body");
	});

	it("renders children content", () => {
		const { container } = render(CardBody, {
			props: { children: textSnippet("<span data-testid='inner'>x</span>") },
		});
		expect(container.querySelector("[data-testid='inner']")).toBeTruthy();
	});
});

describe("CardItem", () => {
	afterEach(cleanup);

	// CardItem reads its hover state from CardContainer via setContext/getContext
	// under the "card3d:mouseEntered" key. @testing-library/svelte forwards a
	// `context` mount option straight to Svelte's mount(), so it can be tested
	// standalone without mounting a full CardContainer tree.
	function withContext(mouseEntered: boolean) {
		return new Map<string, () => boolean>([["card3d:mouseEntered", () => mouseEntered]]);
	}

	it("sits at the zero transform when the container reports no hover", () => {
		const { container } = render(CardItem, {
			props: { translateX: 20, rotateZ: 10 },
			context: withContext(false),
		});
		const el = container.firstElementChild as HTMLElement;
		expect(el.style.transform).toContain("translateX(0px)");
		expect(el.style.transform).toContain("rotateZ(0deg)");
	});

	it("applies the configured translate/rotate values once the container reports hover", () => {
		const { container } = render(CardItem, {
			props: { translateX: 20, translateY: -10, rotateZ: 10 },
			context: withContext(true),
		});
		const el = container.firstElementChild as HTMLElement;
		expect(el.style.transform).toContain("translateX(20px)");
		expect(el.style.transform).toContain("translateY(-10px)");
		expect(el.style.transform).toContain("rotateZ(10deg)");
	});

	it("renders the element specified by the as prop", () => {
		const { container } = render(CardItem, {
			props: { as: "span" },
			context: withContext(false),
		});
		expect(container.firstElementChild?.tagName.toLowerCase()).toBe("span");
	});

	it("defaults to a div and merges custom class names", () => {
		const { container } = render(CardItem, {
			props: { class: "my-item" },
			context: withContext(false),
		});
		const el = container.firstElementChild as HTMLElement;
		expect(el.tagName.toLowerCase()).toBe("div");
		expect(el.className).toContain("my-item");
		expect(el.className).toContain("w-fit");
	});

	it("renders children content", () => {
		const { container } = render(CardItem, {
			props: { children: textSnippet("<em data-testid='item-child'>x</em>") },
			context: withContext(false),
		});
		expect(container.querySelector("[data-testid='item-child']")).toBeTruthy();
	});
});
