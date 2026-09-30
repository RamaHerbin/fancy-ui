import { render, cleanup, act } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { BentoGrid } from "./BentoGrid.js";
import { BentoGridItem } from "./BentoGridItem.js";
import { BentoGridCard } from "./BentoGridCard.js";

const originalMatchMedia = window.matchMedia;

/** Forces the reduced-motion media query to answer `matches`. */
function stubMatchMedia(matches: boolean) {
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		configurable: true,
		value: (query: string) => ({
			matches,
			media: query,
			onchange: null,
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => false,
			addListener: () => {},
			removeListener: () => {},
		}),
	});
}

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

	it("arms the reveal by default", () => {
		const { container } = render(<BentoGrid />);
		const grid = container.firstElementChild as HTMLElement;
		expect(grid.className).toContain("bento-reveal");
		expect(grid.dataset.state).toBe("armed");
	});

	it("drops the reveal class when reveal={false}", () => {
		const { container } = render(<BentoGrid reveal={false} />);
		const grid = container.firstElementChild as HTMLElement;
		expect(grid.className).not.toContain("bento-reveal");
		expect(grid.hasAttribute("data-state")).toBe(false);
	});

	it("never arms the reveal under reduced motion", () => {
		stubMatchMedia(true);
		try {
			const { container } = render(<BentoGrid />);
			const grid = container.firstElementChild as HTMLElement;
			expect(grid.className).not.toContain("bento-reveal");
		} finally {
			Object.defineProperty(window, "matchMedia", {
				writable: true,
				configurable: true,
				value: originalMatchMedia,
			});
		}
	});

	it("reveals at once when focus lands inside the grid", () => {
		const { container } = render(
			<BentoGrid>
				<button>tile</button>
			</BentoGrid>
		);
		const grid = container.firstElementChild as HTMLElement;
		act(() => {
			(grid.querySelector("button") as HTMLButtonElement).focus();
		});
		expect(grid.dataset.state).toBe("shown");
	});

	it("writes the accent prop to --bento-accent", () => {
		const { container } = render(<BentoGrid accent="#ff7a59" />);
		const grid = container.firstElementChild as HTMLElement;
		expect(grid.style.getPropertyValue("--bento-accent")).toBe("#ff7a59");
	});

	it("leaves --bento-accent unset without an accent, so the CSS fallback applies", () => {
		const { container } = render(<BentoGrid />);
		const grid = container.firstElementChild as HTMLElement;
		expect(grid.style.getPropertyValue("--bento-accent")).toBe("");
	});

	it("gives each tile its index and a capped, increasing stagger delay", () => {
		const { container } = render(
			<BentoGrid>
				<BentoGridItem title="One" />
				<BentoGridItem title="Two" />
				<BentoGridItem title="Three" />
			</BentoGrid>
		);
		const tiles = Array.from(
			(container.firstElementChild as HTMLElement).children
		) as HTMLElement[];
		expect(tiles).toHaveLength(3);
		expect(tiles.map((t) => t.style.getPropertyValue("--bento-i"))).toEqual(["0", "1", "2"]);
		const [d0, d1, d2] = tiles.map((t) =>
			parseFloat(t.style.getPropertyValue("--bento-delay"))
		) as [number, number, number];
		expect(d0).toBe(0);
		expect(d1).toBeGreaterThan(d0);
		expect(d2).toBeGreaterThan(d1);
		expect(d2).toBeLessThanOrEqual(420);
	});
});

describe("BentoGridItem", () => {
	afterEach(cleanup);

	it("renders with the base bento-card classes", () => {
		const { container } = render(<BentoGridItem />);
		const item = container.firstElementChild as HTMLElement;
		expect(item.className).toContain("group/bento");
		expect(item.className).toContain("bento-tile");
		expect(item.className).toContain("rounded-2xl");
		// The nested inner panel of the double frame.
		expect(item.querySelector(".bento-panel")).toBeTruthy();
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
		const { container } = render(<BentoGridItem description={<span>Widget description</span>} />);
		expect(container.textContent).toContain("Widget description");
	});

	it("renders the header and icon snippets", () => {
		const { container } = render(
			<BentoGridItem header={<div data-testid="header">H</div>} icon={<svg data-testid="icon" />} />
		);
		expect(container.querySelector("[data-testid='header']")).toBeTruthy();
		expect(container.querySelector("[data-testid='icon']")).toBeTruthy();
	});

	it("omits the title/description wrappers when those snippets are not provided", () => {
		const { container } = render(<BentoGridItem />);
		// Only the outer frame, the inner panel and the content wrapper exist.
		expect(container.querySelectorAll("div").length).toBe(3);
	});

	it("wraps the icon in the inset icon tile", () => {
		const { container } = render(<BentoGridItem icon={<svg data-testid="icon" />} />);
		expect(container.querySelector(".bento-icon [data-testid='icon']")).toBeTruthy();
	});

	it("marks the glow layers as decorative", () => {
		const { container } = render(<BentoGridItem />);
		const glow = container.querySelector(".bento-glow");
		const edge = container.querySelector(".bento-edge");
		expect(glow?.getAttribute("aria-hidden")).toBe("true");
		expect(edge?.getAttribute("aria-hidden")).toBe("true");
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
		// The slot may hold real content: it must stay reachable and interactive.
		const bg = container.querySelector("[data-testid='bg']") as HTMLElement;
		expect(bg.closest("[aria-hidden='true']")).toBeNull();
		expect(bg.closest(".pointer-events-none")).toBeNull();
	});

	it("keeps the cta a real link and marks it for the slide-in", () => {
		const { container } = render(<BentoGridCard {...baseProps} />);
		const link = container.querySelector("a") as HTMLAnchorElement;
		expect(link.className).toContain("bento-cta");
		expect(link.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
	});
});
