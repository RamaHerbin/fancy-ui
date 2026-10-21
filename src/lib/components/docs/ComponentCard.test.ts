import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import ComponentCard from "./ComponentCard.svelte";
import { setLocale } from "$lib/stores";
import type { ComponentMeta } from "$lib/types.js";

const component: ComponentMeta = {
	slug: "rainbow-button",
	name: "RainbowButton",
	description: "Animated rainbow gradient border effect",
	category: "buttons",
	group: "fancy",
	status: "done",
};

describe("ComponentCard", () => {
	afterEach(() => {
		cleanup();
		setLocale("en");
	});

	it("renders the translated category and group badges (regression: gallery showed English badges)", () => {
		const { container } = render(ComponentCard, { component });
		const badges = Array.from(container.querySelectorAll("span.rounded-full")).map((b) =>
			b.textContent?.trim()
		);
		expect(badges).toContain("Buttons");
		expect(badges).toContain("Fancy");
	});

	it("re-renders badges in the active locale", () => {
		setLocale("ja");
		const { container } = render(ComponentCard, { component });
		const badges = Array.from(container.querySelectorAll("span.rounded-full")).map((b) =>
			b.textContent?.trim()
		);
		expect(badges).toContain("ボタン");
		expect(badges).not.toContain("Buttons");
	});

	it("keeps the card name out of the page table of contents", () => {
		const { container } = render(ComponentCard, { component });
		expect(container.querySelector("h3")?.hasAttribute("data-toc-ignore")).toBe(true);
	});

	it("falls back to a generated tile when no thumbnail was captured", () => {
		const { container } = render(ComponentCard, {
			component: { ...component, slug: "no-such-component" },
		});
		expect(container.querySelector("img")).toBeNull();
		expect(container.textContent).toContain("RainbowButton");
	});

	function chips(container: HTMLElement) {
		return Array.from(container.querySelectorAll("span.rounded-full")).map((b) =>
			b.textContent?.trim()
		);
	}

	it("shows no status chip for a finished component", () => {
		const { container } = render(ComponentCard, { component });
		expect(chips(container)).not.toContain("In progress");
		expect(chips(container)).not.toContain("Planned");
	});

	it("labels an in-progress component as in progress", () => {
		const { container } = render(ComponentCard, {
			component: { ...component, status: "in-progress" },
		});
		expect(chips(container)).toContain("In progress");
		expect(chips(container)).not.toContain("Planned");
	});

	it("labels a planned component as planned, not in progress", () => {
		const { container } = render(ComponentCard, { component: { ...component, status: "planned" } });
		expect(chips(container)).toContain("Planned");
		expect(chips(container)).not.toContain("In progress");
	});

	it("renders nothing for a deprecated component", () => {
		const { container } = render(ComponentCard, { component: { ...component, deprecated: true } });
		expect(container.querySelector("a")).toBeNull();
	});
});
