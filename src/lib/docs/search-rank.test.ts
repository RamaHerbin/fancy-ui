import { describe, expect, it } from "vitest";
import { searchComponents } from "$lib/fancy-ui/registry.js";
import type { ComponentMeta } from "$lib/types.js";
import { rankComponents, scoreComponent } from "./search-rank.js";

const meta = (over: Partial<ComponentMeta>): ComponentMeta => ({
	name: "Thing",
	slug: "thing",
	description: "Something else",
	category: "effects",
	group: "fancy",
	status: "done",
	...over,
});

describe("scoreComponent", () => {
	it("ranks exact name < prefix < tag < description (lower is better)", () => {
		const exact = scoreComponent(meta({ name: "Toast", slug: "toast" }), "toast");
		const prefix = scoreComponent(meta({ name: "Toaster", slug: "toaster" }), "toast");
		const tag = scoreComponent(meta({ tags: ["toast"] }), "toast");
		const desc = scoreComponent(meta({ description: "shows a toast" }), "toast");
		expect(exact).toBeLessThan(prefix);
		expect(prefix).toBeLessThan(tag);
		expect(tag).toBeLessThan(desc);
	});

	it("treats a slug match like a name match and is case-insensitive", () => {
		expect(scoreComponent(meta({ name: "Pulse Beam", slug: "pulse-beam" }), "PULSE-BEAM")).toBe(
			scoreComponent(meta({ name: "pulse-beam", slug: "x" }), "pulse-beam")
		);
	});

	it("returns Infinity when nothing matches", () => {
		expect(scoreComponent(meta({}), "zzzz")).toBe(Number.POSITIVE_INFINITY);
	});
});

describe("rankComponents", () => {
	it("returns nothing for an empty query", () => {
		expect(rankComponents("  ")).toEqual([]);
	});

	it("puts the exact name first, even if the registry lists it later", () => {
		expect(rankComponents("tabs")[0]?.slug).toBe("tabs");
	});

	it("returns the same set as searchComponents, only reordered", () => {
		for (const q of ["button", "glow", "scroll", "input"]) {
			expect(new Set(rankComponents(q).map((c) => c.slug))).toEqual(
				new Set(searchComponents(q).map((c) => c.slug))
			);
		}
	});

	it("breaks ties with core before fancy, then by name", () => {
		const a = meta({ name: "B", slug: "b", group: "fancy", description: "needle" });
		const b = meta({ name: "A", slug: "a", group: "fancy", description: "needle" });
		const c = meta({ name: "Z", slug: "z", group: "core", description: "needle" });
		expect(rankComponents("needle", [a, b, c]).map((x) => x.slug)).toEqual(["z", "a", "b"]);
	});

	it("never mutates its input", () => {
		const list = [
			meta({ name: "Q", slug: "q", description: "needle" }),
			meta({ name: "Needle", slug: "n" }),
		];
		const copy = [...list];
		rankComponents("needle", list);
		expect(list).toEqual(copy);
	});
});
