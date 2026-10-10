import { render, cleanup } from "@testing-library/vue";
import { afterEach, describe, it, expect } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import BentoGrid from "./BentoGrid.vue";
import BentoGridItem from "./BentoGridItem.vue";
import BentoGridCard from "./BentoGridCard.vue";

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

/** A grid holding three titled items (the Svelte side's BentoHarness). */
const BentoHarness = defineComponent({
	name: "BentoHarness",
	setup() {
		return () =>
			h(BentoGrid, null, {
				default: () =>
					["One", "Two", "Three"].map((label) =>
						h(BentoGridItem, { key: label }, { title: () => label })
					),
			});
	},
});

describe("BentoGrid", () => {
	afterEach(cleanup);

	it("renders a grid wrapper with the expected layout classes", () => {
		const { container } = render(BentoGrid);
		const grid = container.firstElementChild as HTMLElement;
		expect(grid.className).toContain("grid");
		expect(grid.className).toContain("md:grid-cols-3");
	});

	it("applies custom class names alongside the base layout classes", () => {
		const { container } = render(BentoGrid, { props: { class: "my-grid" } });
		const grid = container.firstElementChild as HTMLElement;
		expect(grid.className).toContain("my-grid");
		expect(grid.className).toContain("grid");
	});

	it("renders children content passed via the default slot", () => {
		const { container } = render(BentoGrid, {
			slots: { default: "<span data-testid='child'>card</span>" },
		});
		expect(container.querySelector("[data-testid='child']")?.textContent).toBe("card");
	});

	it("arms the reveal by default", async () => {
		const { container } = render(BentoGrid);
		await nextTick();
		const grid = container.firstElementChild as HTMLElement;
		expect(grid.className).toContain("bento-reveal");
		expect(grid.dataset.state).toBe("armed");
	});

	it("drops the reveal class when reveal={false}", async () => {
		const { container } = render(BentoGrid, { props: { reveal: false } });
		await nextTick();
		const grid = container.firstElementChild as HTMLElement;
		expect(grid.className).not.toContain("bento-reveal");
		expect(grid.hasAttribute("data-state")).toBe(false);
	});

	it("never arms the reveal under reduced motion", async () => {
		stubMatchMedia(true);
		try {
			const { container } = render(BentoGrid);
			await nextTick();
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

	it("reveals at once when focus lands inside the grid", async () => {
		const { container } = render(BentoGrid, {
			slots: { default: "<button>tile</button>" },
		});
		await nextTick();
		const grid = container.firstElementChild as HTMLElement;
		(grid.querySelector("button") as HTMLButtonElement).focus();
		await nextTick();
		expect(grid.dataset.state).toBe("shown");
	});

	it("writes the accent prop to --bento-accent", () => {
		const { container } = render(BentoGrid, { props: { accent: "#ff7a59" } });
		const grid = container.firstElementChild as HTMLElement;
		expect(grid.style.getPropertyValue("--bento-accent")).toBe("#ff7a59");
	});

	it("leaves --bento-accent unset without an accent, so the CSS fallback applies", () => {
		const { container } = render(BentoGrid);
		const grid = container.firstElementChild as HTMLElement;
		expect(grid.style.getPropertyValue("--bento-accent")).toBe("");
	});

	it("gives each tile its index and a capped, increasing stagger delay", async () => {
		const { container } = render(BentoHarness);
		await nextTick();
		const tiles = Array.from(
			(container.firstElementChild as HTMLElement).children
		) as HTMLElement[];
		expect(tiles).toHaveLength(3);
		expect(tiles.map((t) => t.style.getPropertyValue("--bento-i"))).toEqual(["0", "1", "2"]);
		const delays = tiles.map((t) => parseFloat(t.style.getPropertyValue("--bento-delay")));
		const [d0, d1, d2] = delays as [number, number, number];
		expect(d0).toBe(0);
		expect(d1).toBeGreaterThan(d0);
		expect(d2).toBeGreaterThan(d1);
		expect(d2).toBeLessThanOrEqual(420);
	});
});

describe("BentoGridItem", () => {
	afterEach(cleanup);

	it("renders with the base bento-card classes", () => {
		const { container } = render(BentoGridItem);
		const item = container.firstElementChild as HTMLElement;
		expect(item.className).toContain("group/bento");
		expect(item.className).toContain("bento-tile");
		expect(item.className).toContain("rounded-2xl");
		// The nested inner panel of the double frame.
		expect(item.querySelector(".bento-panel")).toBeTruthy();
	});

	it("applies custom class names", () => {
		const { container } = render(BentoGridItem, { props: { class: "my-item" } });
		const item = container.firstElementChild as HTMLElement;
		expect(item.className).toContain("my-item");
	});

	it("renders the title slot", () => {
		const { container } = render(BentoGridItem, {
			slots: { title: "<span>Widget title</span>" },
		});
		expect(container.textContent).toContain("Widget title");
	});

	it("renders the description slot", () => {
		const { container } = render(BentoGridItem, {
			slots: { description: "<span>Widget description</span>" },
		});
		expect(container.textContent).toContain("Widget description");
	});

	it("renders the header and icon slots", () => {
		const { container } = render(BentoGridItem, {
			slots: {
				header: "<div data-testid='header'>H</div>",
				icon: "<svg data-testid='icon'></svg>",
			},
		});
		expect(container.querySelector("[data-testid='header']")).toBeTruthy();
		expect(container.querySelector("[data-testid='icon']")).toBeTruthy();
	});

	it("omits the title/description wrappers when those slots are not provided", () => {
		const { container } = render(BentoGridItem);
		// Only the outer frame, the inner panel and the content wrapper exist.
		expect(container.querySelectorAll("div").length).toBe(3);
	});

	it("wraps the icon in the inset icon tile", () => {
		const { container } = render(BentoGridItem, {
			slots: { icon: "<svg data-testid='icon'></svg>" },
		});
		expect(container.querySelector(".bento-icon [data-testid='icon']")).toBeTruthy();
	});

	it("marks the glow layers as decorative", () => {
		const { container } = render(BentoGridItem);
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
		const { container } = render(BentoGridCard, { props: baseProps });
		const heading = container.querySelector("h3");
		const desc = container.querySelector("p");
		const link = container.querySelector("a") as HTMLAnchorElement;
		expect(heading?.textContent?.trim()).toBe("Feature");
		expect(desc?.textContent).toBe("Does a thing");
		expect(link.getAttribute("href")).toBe("/feature");
		expect(link.textContent).toContain("Learn more");
	});

	it("applies custom class names", () => {
		const { container } = render(BentoGridCard, {
			props: { ...baseProps, class: "my-card" },
		});
		const card = container.firstElementChild as HTMLElement;
		expect(card.className).toContain("my-card");
	});

	it("renders an icon slot when provided", () => {
		const { container } = render(BentoGridCard, {
			props: baseProps,
			slots: { icon: "<svg data-testid='icon'></svg>" },
		});
		expect(container.querySelector("[data-testid='icon']")).toBeTruthy();
	});

	it("renders a background slot when provided", () => {
		const { container } = render(BentoGridCard, {
			props: baseProps,
			slots: { background: "<div data-testid='bg'></div>" },
		});
		expect(container.querySelector("[data-testid='bg']")).toBeTruthy();
		// The slot may hold real content: it must stay reachable and interactive.
		const bg = container.querySelector("[data-testid='bg']") as HTMLElement;
		expect(bg.closest("[aria-hidden='true']")).toBeNull();
		expect(bg.closest(".pointer-events-none")).toBeNull();
	});

	it("keeps the cta a real link and marks it for the slide-in", () => {
		const { container } = render(BentoGridCard, { props: baseProps });
		const link = container.querySelector("a") as HTMLAnchorElement;
		expect(link.className).toContain("bento-cta");
		expect(link.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
	});
});
