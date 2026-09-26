import { render, cleanup, fireEvent } from "@testing-library/vue";
import { afterEach, describe, it, expect } from "vitest";

import CardContainer from "./CardContainer.vue";
import CardBody from "./CardBody.vue";
import CardItem from "./CardItem.vue";
import { CARD3D_CONTEXT } from "./context.js";

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
			slots: { default: "<p data-testid='content'>card body</p>" },
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
			slots: { default: "<span data-testid='inner'>x</span>" },
		});
		expect(container.querySelector("[data-testid='inner']")).toBeTruthy();
	});
});

describe("CardItem", () => {
	afterEach(cleanup);

	// CardItem reads its hover state from CardContainer through the card-3d
	// context. Providing the getter directly stands in for the full container
	// tree, so the item can be exercised standalone at either hover state.
	function withContext(mouseEntered: boolean) {
		return { global: { provide: { [CARD3D_CONTEXT.key as symbol]: () => mouseEntered } } };
	}

	it("sits at the zero transform when the container reports no hover", () => {
		const { container } = render(CardItem, {
			props: { translateX: 20, rotateZ: 10 },
			...withContext(false),
		});
		const el = container.firstElementChild as HTMLElement;
		expect(el.style.transform).toContain("translateX(0px)");
		expect(el.style.transform).toContain("rotateZ(0deg)");
	});

	it("applies the configured translate/rotate values once the container reports hover", () => {
		const { container } = render(CardItem, {
			props: { translateX: 20, translateY: -10, rotateZ: 10 },
			...withContext(true),
		});
		const el = container.firstElementChild as HTMLElement;
		expect(el.style.transform).toContain("translateX(20px)");
		expect(el.style.transform).toContain("translateY(-10px)");
		expect(el.style.transform).toContain("rotateZ(10deg)");
	});

	it("renders the element specified by the as prop", () => {
		const { container } = render(CardItem, {
			props: { as: "span" },
			...withContext(false),
		});
		expect(container.firstElementChild?.tagName.toLowerCase()).toBe("span");
	});

	it("defaults to a div and merges custom class names", () => {
		const { container } = render(CardItem, {
			props: { class: "my-item" },
			...withContext(false),
		});
		const el = container.firstElementChild as HTMLElement;
		expect(el.tagName.toLowerCase()).toBe("div");
		expect(el.className).toContain("my-item");
		expect(el.className).toContain("w-fit");
	});

	it("renders children content", () => {
		const { container } = render(CardItem, {
			slots: { default: "<em data-testid='item-child'>x</em>" },
			...withContext(false),
		});
		expect(container.querySelector("[data-testid='item-child']")).toBeTruthy();
	});

	it("renders its rest transform outside a CardContainer instead of throwing", () => {
		const { container } = render(CardItem, { props: { translateZ: 50 } });
		const el = container.firstElementChild as HTMLElement;
		expect(el.style.transform).toContain("translateZ(0px)");
	});
});
