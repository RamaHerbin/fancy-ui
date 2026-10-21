import { describe, expect, it } from "vitest";
import { componentsInSidebarOrder, neighboursInSidebarOrder } from "./component-order.js";
import {
	coreCategories,
	fancyCategories,
	getComponentsGroupedByCategoryForGroup,
	registry,
} from "$lib/fancy-ui/registry.js";

function stubDeprecated() {
	registry["zz-stub-deprecated"] = {
		name: "StubDeprecated",
		slug: "zz-stub-deprecated",
		description: "stub",
		category: "buttons",
		group: "core",
		status: "done",
		deprecated: true,
	};
}

describe("componentsInSidebarOrder", () => {
	it("lists core groups first, then fancy, each in category order", () => {
		const core = getComponentsGroupedByCategoryForGroup("core");
		const fancy = getComponentsGroupedByCategoryForGroup("fancy");
		const expected = [
			...coreCategories.flatMap((c) => core[c]),
			...fancyCategories.flatMap((c) => fancy[c]),
		].map((c) => c.slug);
		expect(componentsInSidebarOrder().map((c) => c.slug)).toEqual(expected);
	});

	it("differs from the alphabetical order", () => {
		const names = componentsInSidebarOrder().map((c) => c.name);
		expect(names).not.toEqual([...names].sort((a, b) => a.localeCompare(b, "en")));
	});

	it("skips deprecated entries", () => {
		stubDeprecated();
		try {
			expect(componentsInSidebarOrder().map((c) => c.slug)).not.toContain("zz-stub-deprecated");
		} finally {
			delete registry["zz-stub-deprecated"];
		}
	});
});

describe("neighboursInSidebarOrder", () => {
	it("returns the entries around a known pair", () => {
		const list = componentsInSidebarOrder();
		const i = Math.floor(list.length / 2);
		const n = neighboursInSidebarOrder(list[i].slug);
		expect(n.previous?.slug).toBe(list[i - 1].slug);
		expect(n.next?.slug).toBe(list[i + 1].slug);
	});

	it("does not wrap at either end", () => {
		const list = componentsInSidebarOrder();
		expect(neighboursInSidebarOrder(list[0].slug).previous).toBeUndefined();
		expect(neighboursInSidebarOrder(list[list.length - 1].slug).next).toBeUndefined();
	});

	it("returns nothing for an unknown slug", () => {
		expect(neighboursInSidebarOrder("nope")).toEqual({});
	});
});
