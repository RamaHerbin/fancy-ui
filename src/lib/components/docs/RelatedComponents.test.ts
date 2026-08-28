import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import RelatedComponents from "./RelatedComponents.svelte";
import { setLocale } from "$lib/stores";
import { getAllComponents } from "$lib/fancy-ui/registry.js";
import type { ComponentCategory, ComponentMeta } from "$lib/types.js";

const all = getAllComponents();

function categoryMembers(category: ComponentCategory): ComponentMeta[] {
	return all.filter((c) => c.category === category);
}

const allCategories = [...new Set(all.map((c) => c.category))].map(categoryMembers);

/** Registry-derived fixtures, so adding components never invalidates the test. */
function firstCategoryWithAtLeast(n: number): ComponentMeta[] {
	const match = allCategories.find((members) => members.length >= n);
	if (!match) throw new Error(`No category has ${n} or more components`);
	return match;
}

/**
 * A component with no category siblings. Prefer a real single-member category;
 * once every category has grown siblings, synthesise one in a category the
 * registry does not use yet so the empty state stays testable regardless of
 * how the registry fills in.
 */
function soloComponent(): ComponentMeta {
	const solo = allCategories.find((members) => members.length === 1);
	if (solo) return solo[0];
	const used = new Set(all.map((c) => c.category));
	const unused = (
		["display", "media", "data-display", "layout", "feedback", "backgrounds"] as ComponentCategory[]
	).find((category) => !used.has(category));
	if (!unused) throw new Error("No empty or single-component category to exercise the empty state");
	return { ...all[0], slug: "__solo__", name: "Solo", category: unused };
}

function linkedSlugs(container: HTMLElement): string[] {
	return Array.from(container.querySelectorAll("a")).map(
		(a) => a.getAttribute("href")?.replace("/docs/components/", "") ?? ""
	);
}

describe("RelatedComponents", () => {
	afterEach(() => {
		cleanup();
		setLocale("en");
	});

	it("renders the translated heading with the anchor the table of contents links to", () => {
		const [component] = firstCategoryWithAtLeast(2);
		const { container } = render(RelatedComponents, { component });
		const heading = container.querySelector("h2");
		expect(heading).toHaveAttribute("id", "related");
		expect(heading?.textContent?.trim()).toBe("Related components");
	});

	it("caps the list at three siblings", () => {
		const [component] = firstCategoryWithAtLeast(5);
		const { container } = render(RelatedComponents, { component });
		expect(linkedSlugs(container)).toHaveLength(3);
	});

	it("never links the component back to its own page", () => {
		const members = firstCategoryWithAtLeast(4);
		for (const component of members) {
			const { container } = render(RelatedComponents, { component });
			expect(linkedSlugs(container)).not.toContain(component.slug);
			cleanup();
		}
	});

	it("only suggests components from the same category, sorted by name", () => {
		const members = firstCategoryWithAtLeast(4);
		const component = members[0];
		const { container } = render(RelatedComponents, { component });

		const shown = linkedSlugs(container).map((slug) => all.find((c) => c.slug === slug)!);
		expect(shown.every((c) => c.category === component.category)).toBe(true);

		const expected = members
			.filter((c) => c.slug !== component.slug)
			.sort((a, b) => a.name.localeCompare(b.name, "en"))
			.slice(0, 3)
			.map((c) => c.slug);
		expect(shown.map((c) => c.slug)).toEqual(expected);
	});

	it("renders nothing when the category holds no other component", () => {
		const { container } = render(RelatedComponents, { component: soloComponent() });
		expect(container.querySelector("section")).toBeNull();
		expect(container.querySelector("h2")).toBeNull();
	});
});
