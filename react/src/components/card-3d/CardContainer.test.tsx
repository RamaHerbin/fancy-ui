import { render, cleanup, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, it, expect } from "vitest";

import { CardContainer, Card3DProvider } from "./CardContainer.js";
import { CardBody } from "./CardBody.js";
import { CardItem } from "./CardItem.js";

describe("CardContainer", () => {
	afterEach(cleanup);

	it("renders the perspective wrapper and the 3d inner container", () => {
		const { container } = render(<CardContainer />);
		const outer = container.firstElementChild as HTMLElement;
		const inner = outer.firstElementChild as HTMLElement;
		expect(outer.getAttribute("style")).toContain("perspective: 1000px");
		expect(inner.getAttribute("style")).toContain("transform-style: preserve-3d");
	});

	it("applies containerClass to the outer wrapper and class to the inner container", () => {
		const { container } = render(<CardContainer containerClass="my-outer" className="my-inner" />);
		const outer = container.firstElementChild as HTMLElement;
		const inner = outer.firstElementChild as HTMLElement;
		expect(outer.className).toContain("my-outer");
		expect(inner.className).toContain("my-inner");
	});

	it("renders children content", () => {
		const { container } = render(
			<CardContainer>
				<p data-testid="content">card body</p>
			</CardContainer>
		);
		expect(container.querySelector("[data-testid='content']")?.textContent).toBe("card body");
	});

	it("rotates the inner container on mousemove and resets on mouseleave", () => {
		const { container } = render(<CardContainer />);
		const inner = (container.firstElementChild as HTMLElement).firstElementChild as HTMLElement;

		// jsdom's getBoundingClientRect() is all zeros, so rotateY = clientX / 25
		// and rotateX = clientY / 25 for this component's handler.
		fireEvent.mouseMove(inner, { clientX: 50, clientY: 25 });
		expect(inner.style.transform).toBe("rotateY(2deg) rotateX(1deg)");

		// React derives onMouseLeave from the native `mouseout` event, so that is
		// what the test has to dispatch — a bare `mouseleave` does not bubble to
		// React's root listener and would never reach the handler.
		fireEvent.mouseOut(inner);
		expect(inner.style.transform).toBe("rotateY(0deg) rotateX(0deg)");
	});
});

describe("CardBody", () => {
	afterEach(cleanup);

	it("renders with the fixed 3d-card dimensions", () => {
		const { container } = render(<CardBody />);
		const body = container.firstElementChild as HTMLElement;
		expect(body.className).toContain("h-96");
		expect(body.className).toContain("w-96");
		expect(body.getAttribute("style")).toContain("transform-style: preserve-3d");
	});

	it("applies custom class names", () => {
		const { container } = render(<CardBody className="my-body" />);
		const body = container.firstElementChild as HTMLElement;
		expect(body.className).toContain("my-body");
	});

	it("renders children content", () => {
		const { container } = render(
			<CardBody>
				<span data-testid="inner">x</span>
			</CardBody>
		);
		expect(container.querySelector("[data-testid='inner']")).toBeTruthy();
	});
});

describe("CardItem", () => {
	afterEach(cleanup);

	// CardItem reads its hover state from CardContainer through the card-3d
	// context. Rendering the provider directly stands in for the full container
	// tree, so the item can be exercised standalone at either hover state.
	function WithHover({ mouseEntered, children }: { mouseEntered: boolean; children: ReactNode }) {
		return <Card3DProvider value={{ isMouseEntered: mouseEntered }}>{children}</Card3DProvider>;
	}

	it("sits at the zero transform when the container reports no hover", () => {
		const { container } = render(
			<WithHover mouseEntered={false}>
				<CardItem translateX={20} rotateZ={10} />
			</WithHover>
		);
		const el = container.firstElementChild as HTMLElement;
		expect(el.style.transform).toContain("translateX(0px)");
		expect(el.style.transform).toContain("rotateZ(0deg)");
	});

	it("applies the configured translate/rotate values once the container reports hover", () => {
		const { container } = render(
			<WithHover mouseEntered={true}>
				<CardItem translateX={20} translateY={-10} rotateZ={10} />
			</WithHover>
		);
		const el = container.firstElementChild as HTMLElement;
		expect(el.style.transform).toContain("translateX(20px)");
		expect(el.style.transform).toContain("translateY(-10px)");
		expect(el.style.transform).toContain("rotateZ(10deg)");
	});

	it("renders the element specified by the as prop", () => {
		const { container } = render(
			<WithHover mouseEntered={false}>
				<CardItem as="span" />
			</WithHover>
		);
		expect(container.firstElementChild?.tagName.toLowerCase()).toBe("span");
	});

	it("defaults to a div and merges custom class names", () => {
		const { container } = render(
			<WithHover mouseEntered={false}>
				<CardItem className="my-item" />
			</WithHover>
		);
		const el = container.firstElementChild as HTMLElement;
		expect(el.tagName.toLowerCase()).toBe("div");
		expect(el.className).toContain("my-item");
		expect(el.className).toContain("w-fit");
	});

	it("renders children content", () => {
		const { container } = render(
			<WithHover mouseEntered={false}>
				<CardItem>
					<em data-testid="item-child">x</em>
				</CardItem>
			</WithHover>
		);
		expect(container.querySelector("[data-testid='item-child']")).toBeTruthy();
	});
});
