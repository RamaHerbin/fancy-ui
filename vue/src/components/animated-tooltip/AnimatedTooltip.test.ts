import { render, cleanup, fireEvent } from "@testing-library/vue";
import { afterEach, describe, it, expect, vi } from "vitest";
import AnimatedTooltip from "./AnimatedTooltip.vue";

const mockItems = [
	{ id: 1, name: "Alice", designation: "Engineer", image: "/alice.jpg" },
	{ id: 2, name: "Bob", designation: "Designer", image: "/bob.jpg" },
];

const fourItems = [
	...mockItems,
	{ id: 3, name: "Cleo", designation: "Writer", image: "/cleo.jpg" },
	{ id: 4, name: "Dan", designation: "Founder", image: "/dan.jpg" },
];

/** Replaces `window.matchMedia` wholesale (the repo-wide pattern). */
function stubReducedMotion(matches: boolean) {
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches: query.includes("prefers-reduced-motion: reduce") ? matches : false,
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
		addListener: () => {},
		removeListener: () => {},
	}));
}

describe("AnimatedTooltip", () => {
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it("renders one avatar image per item", () => {
		const { container } = render(AnimatedTooltip, {
			props: { items: mockItems },
		});
		const imgs = container.querySelectorAll("img");
		expect(imgs.length).toBe(2);
	});

	it("sets correct alt text on images", () => {
		const { container } = render(AnimatedTooltip, {
			props: { items: mockItems },
		});
		const imgs = container.querySelectorAll("img");
		expect(imgs[0]).toHaveAttribute("alt", "Alice");
		expect(imgs[1]).toHaveAttribute("alt", "Bob");
	});

	it("sets correct src on images", () => {
		const { container } = render(AnimatedTooltip, {
			props: { items: mockItems },
		});
		const imgs = container.querySelectorAll("img");
		expect(imgs[0]).toHaveAttribute("src", "/alice.jpg");
		expect(imgs[1]).toHaveAttribute("src", "/bob.jpg");
	});

	it("renders a flex container", () => {
		const { container } = render(AnimatedTooltip, {
			props: { items: mockItems },
		});
		const wrapper = container.firstElementChild as HTMLElement;
		expect(wrapper?.className).toContain("flex");
	});

	it("applies custom class names", () => {
		const { container } = render(AnimatedTooltip, {
			props: { items: mockItems, class: "custom" },
		});
		const wrapper = container.firstElementChild as HTMLElement;
		expect(wrapper?.className).toContain("custom");
	});

	it("renders empty when items is empty", () => {
		const { container } = render(AnimatedTooltip, { props: { items: [] } });
		const imgs = container.querySelectorAll("img");
		expect(imgs.length).toBe(0);
	});

	it("each item wrapper has group class", () => {
		const { container } = render(AnimatedTooltip, {
			props: { items: mockItems },
		});
		const groups = container.querySelectorAll(".group");
		expect(groups.length).toBe(2);
	});

	it("images have rounded-full class", () => {
		const { container } = render(AnimatedTooltip, {
			props: { items: mockItems },
		});
		const imgs = container.querySelectorAll("img");
		expect(imgs[0]?.className).toContain("rounded-full");
		expect(imgs[1]?.className).toContain("rounded-full");
	});

	it("does not expose the avatar wrapper as role=button", () => {
		const { container } = render(AnimatedTooltip, {
			props: { items: mockItems },
		});
		const wrappers = container.querySelectorAll(".group");
		wrappers.forEach((wrapper) => {
			expect(wrapper).not.toHaveAttribute("role", "button");
		});
	});

	it("shows a role=tooltip node referenced by aria-describedby on focus", async () => {
		const { container } = render(AnimatedTooltip, {
			props: { items: mockItems },
		});
		const wrapper = container.querySelector(".group") as HTMLElement;

		// No tooltip association before interaction.
		expect(wrapper).not.toHaveAttribute("aria-describedby");

		await fireEvent.focusIn(wrapper);
		const describedBy = wrapper.getAttribute("aria-describedby");
		expect(describedBy).toBeTruthy();
		const tooltip = document.getElementById(describedBy!);
		expect(tooltip).toHaveAttribute("role", "tooltip");

		await fireEvent.focusOut(wrapper);
		expect(wrapper).not.toHaveAttribute("aria-describedby");
	});

	it("marks the hovered item active and lifts its avatar", async () => {
		stubReducedMotion(false);
		const { container } = render(AnimatedTooltip, { props: { items: fourItems } });
		const wrappers = container.querySelectorAll<HTMLElement>(".at-item");

		await fireEvent.mouseEnter(wrappers[1]!);
		expect(wrappers[1]).toHaveAttribute("data-active");
		expect(wrappers[1]!.className).toContain("at-active");
		expect(wrappers[1]!.querySelector(".at-avatar")!.className).toContain("at-lifted");
		expect(wrappers[0]).not.toHaveAttribute("data-active");

		await fireEvent.mouseLeave(wrappers[1]!);
		expect(wrappers[1]).not.toHaveAttribute("data-active");
		expect(wrappers[1]!.querySelector(".at-avatar")!.className).not.toContain("at-lifted");
	});

	it("parts the neighbours away from the hovered item", async () => {
		stubReducedMotion(false);
		const { container } = render(AnimatedTooltip, { props: { items: fourItems } });
		const wrappers = container.querySelectorAll<HTMLElement>(".at-item");

		await fireEvent.mouseEnter(wrappers[1]!);
		expect(wrappers[0]!.className).toContain("at-parted");
		expect(wrappers[0]).toHaveAttribute("data-part", "before");
		expect(wrappers[2]!.className).toContain("at-parted");
		expect(wrappers[2]).toHaveAttribute("data-part", "after");
		expect(wrappers[0]!.style.getPropertyValue("--_at-shift")).toBe("-6px");
		expect(wrappers[2]!.style.getPropertyValue("--_at-shift")).toBe("6px");
		// The hovered item itself does not move sideways.
		expect(wrappers[1]!.className).not.toContain("at-parted");
	});

	it("pipes accent and size into CSS custom properties", () => {
		const { container } = render(AnimatedTooltip, {
			props: { items: mockItems, accent: "rgb(240, 163, 110)", size: 72 },
		});
		const root = container.firstElementChild as HTMLElement;
		expect(root.getAttribute("style")).toContain("--at-accent: rgb(240, 163, 110)");
		expect(root.getAttribute("style")).toContain("--at-accent-2:");
		expect(root.style.getPropertyValue("--_at-size")).toBe("72px");
	});

	it("defaults to a 56px avatar and no inline accent", () => {
		const { container } = render(AnimatedTooltip, { props: { items: mockItems } });
		const root = container.firstElementChild as HTMLElement;
		expect(root.style.getPropertyValue("--_at-size")).toBe("56px");
		expect(root.getAttribute("style")).not.toContain("--at-accent");
	});

	it("keeps presence layers out of the accessibility tree", async () => {
		const { container } = render(AnimatedTooltip, { props: { items: mockItems } });
		for (const el of container.querySelectorAll(".at-ring, .at-glow, .at-disc")) {
			expect(el).toHaveAttribute("aria-hidden", "true");
		}
		const wrapper = container.querySelector(".group") as HTMLElement;
		await fireEvent.focusIn(wrapper);
		const tip = container.querySelector('[role="tooltip"]')!;
		expect(tip.querySelector(".at-rule")).toHaveAttribute("aria-hidden", "true");
		expect(tip.textContent).toContain("Alice");
		expect(tip.textContent).toContain("Engineer");
	});

	it("suppresses lift and parting under reduced motion, but still opens", async () => {
		stubReducedMotion(true);
		const { container } = render(AnimatedTooltip, { props: { items: fourItems } });
		const wrappers = container.querySelectorAll<HTMLElement>(".at-item");

		await fireEvent.mouseEnter(wrappers[1]!, { clientX: 500 });
		expect(wrappers[1]).toHaveAttribute("data-active");
		expect(container.querySelector('[role="tooltip"]')).not.toBeNull();
		expect(wrappers[1]!.querySelector(".at-avatar")!.className).not.toContain("at-lifted");
		expect(container.querySelectorAll(".at-parted").length).toBe(0);
		const tip = container.querySelector<HTMLElement>('[role="tooltip"]')!;
		expect(tip.style.transform).toContain("rotate(0deg)");
	});

	it("keeps tooltip ids single-token and unique across rows sharing item ids", async () => {
		const spaced = [{ id: "first person", name: "Alice", designation: "Eng", image: "/a.jpg" }];
		const { container } = render({
			components: { AnimatedTooltip },
			setup: () => ({ spaced }),
			template: '<div><AnimatedTooltip :items="spaced" /><AnimatedTooltip :items="spaced" /></div>',
		});
		const [a, b] = [...container.querySelectorAll(".group")] as HTMLElement[];
		await fireEvent.focusIn(a!);
		await fireEvent.focusIn(b!);
		const idA = a!.getAttribute("aria-describedby")!;
		const idB = b!.getAttribute("aria-describedby")!;
		expect(idA).not.toMatch(/\s/);
		expect(idA).not.toBe(idB);
		expect(document.getElementById(idA)?.parentElement).toBe(a);
		expect(document.getElementById(idB)?.parentElement).toBe(b);
	});
});
