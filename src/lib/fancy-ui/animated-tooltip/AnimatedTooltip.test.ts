import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import AnimatedTooltip from "./AnimatedTooltip.svelte";

const mockItems = [
	{ id: 1, name: "Alice", designation: "Engineer", image: "/alice.jpg" },
	{ id: 2, name: "Bob", designation: "Designer", image: "/bob.jpg" },
];

describe("AnimatedTooltip", () => {
	afterEach(cleanup);

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
		const tooltip = container.querySelector(`#${describedBy}`);
		expect(tooltip).toHaveAttribute("role", "tooltip");

		await fireEvent.focusOut(wrapper);
		expect(wrapper).not.toHaveAttribute("aria-describedby");
	});
});
