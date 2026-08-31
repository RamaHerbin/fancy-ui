import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { BentoGrid } from "./BentoGrid.js";
import { BentoGridItem } from "./BentoGridItem.js";
import { BentoGridCard } from "./BentoGridCard.js";

describe("BentoGrid", () => {
	afterEach(cleanup);

	it("renders a grid wrapper with the expected layout classes", () => {
		const { container } = render(<BentoGrid />);
		const grid = container.firstElementChild as HTMLElement;
		expect(grid.className).toContain("grid");
		expect(grid.className).toContain("md:grid-cols-3");
	});

	it("applies custom class names alongside the base layout classes", () => {
		const { container } = render(<BentoGrid className="my-grid" />);
		const grid = container.firstElementChild as HTMLElement;
		expect(grid.className).toContain("my-grid");
		expect(grid.className).toContain("grid");
	});

	it("renders children content passed via the default snippet", () => {
		const { container } = render(
			<BentoGrid>
				<span data-testid="child">card</span>
			</BentoGrid>
		);
		expect(container.querySelector("[data-testid='child']")?.textContent).toBe("card");
	});
});

describe("BentoGridItem", () => {
	afterEach(cleanup);

	it("renders with the base bento-card classes", () => {
		const { container } = render(<BentoGridItem />);
		const item = container.firstElementChild as HTMLElement;
		expect(item.className).toContain("group/bento");
		expect(item.className).toContain("rounded-xl");
	});

	it("applies custom class names", () => {
		const { container } = render(<BentoGridItem className="my-item" />);
		const item = container.firstElementChild as HTMLElement;
		expect(item.className).toContain("my-item");
	});

	it("renders the title snippet", () => {
		const { container } = render(<BentoGridItem title={<span>Widget title</span>} />);
		expect(container.textContent).toContain("Widget title");
	});

	it("renders the description snippet", () => {
		const { container } = render(
			<BentoGridItem description={<span>Widget description</span>} />
		);
		expect(container.textContent).toContain("Widget description");
	});

	it("renders the header and icon snippets", () => {
		const { container } = render(
			<BentoGridItem
				header={<div data-testid="header">H</div>}
				icon={<svg data-testid="icon" />}
			/>
		);
		expect(container.querySelector("[data-testid='header']")).toBeTruthy();
		expect(container.querySelector("[data-testid='icon']")).toBeTruthy();
	});

	it("omits the title/description wrappers when those snippets are not provided", () => {
		const { container } = render(<BentoGridItem />);
		// Only the outer card and the inner hover-translate wrapper should exist.
		expect(container.querySelectorAll("div").length).toBe(2);
	});
});

describe("BentoGridCard", () => {
	afterEach(cleanup);

	const baseProps = {
		name: "Feature",
		description: "Does a thing",
		href: "/feature",
		cta: "Learn more",
	};

	it("renders the name, description, and cta link", () => {
		const { container } = render(<BentoGridCard {...baseProps} />);
		const heading = container.querySelector("h3");
		const desc = container.querySelector("p");
		const link = container.querySelector("a") as HTMLAnchorElement;
		expect(heading?.textContent?.trim()).toBe("Feature");
		expect(desc?.textContent).toBe("Does a thing");
		expect(link.getAttribute("href")).toBe("/feature");
		expect(link.textContent).toContain("Learn more");
	});

	it("applies custom class names", () => {
		const { container } = render(<BentoGridCard {...baseProps} className="my-card" />);
		const card = container.firstElementChild as HTMLElement;
		expect(card.className).toContain("my-card");
	});

	it("renders an icon snippet when provided", () => {
		const { container } = render(
			<BentoGridCard {...baseProps} icon={<svg data-testid="icon" />} />
		);
		expect(container.querySelector("[data-testid='icon']")).toBeTruthy();
	});

	it("renders a background snippet when provided", () => {
		const { container } = render(
			<BentoGridCard {...baseProps} background={<div data-testid="bg" />} />
		);
		expect(container.querySelector("[data-testid='bg']")).toBeTruthy();
	});
});
