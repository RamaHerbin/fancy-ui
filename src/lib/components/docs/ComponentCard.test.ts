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
	status: "done",
};

describe("ComponentCard", () => {
	afterEach(() => {
		cleanup();
		setLocale("en");
	});

	it("renders the translated category and status badges (regression: gallery showed English badges)", () => {
		const { container } = render(ComponentCard, { component });
		const badges = Array.from(container.querySelectorAll("span.rounded-full")).map((b) =>
			b.textContent?.trim()
		);
		expect(badges).toContain("Buttons");
		expect(badges).toContain("Stable");
	});

	it("re-renders badges in the active locale", () => {
		setLocale("ja");
		const { container } = render(ComponentCard, { component });
		const badges = Array.from(container.querySelectorAll("span.rounded-full")).map((b) =>
			b.textContent?.trim()
		);
		expect(badges).toContain("ボタン");
		expect(badges).toContain("安定版");
		expect(badges).not.toContain("Buttons");
	});
});
