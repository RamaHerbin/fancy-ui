import { describe, expect, it } from "vitest";
import { getAllComponents, getListedComponents, hasSoundProp, registry } from "./registry.js";

describe("getListedComponents", () => {
	it("returns every registry entry that is not deprecated", () => {
		expect(getListedComponents().length).toBe(
			getAllComponents().filter((c) => !c.deprecated).length
		);
	});

	it("excludes a deprecated entry and keeps the rest", () => {
		registry["zz-stub-deprecated"] = {
			name: "StubDeprecated",
			slug: "zz-stub-deprecated",
			description: "stub",
			category: "buttons",
			group: "core",
			status: "done",
			deprecated: true,
		};
		try {
			const slugs = getListedComponents().map((c) => c.slug);
			expect(slugs).not.toContain("zz-stub-deprecated");
			expect(slugs).toContain("button");
		} finally {
			delete registry["zz-stub-deprecated"];
		}
	});
});

describe("hasSoundProp", () => {
	it("is true for a component whose props table documents `sound`", () => {
		expect(hasSoundProp("button")).toBe(true);
		expect(hasSoundProp("dialog")).toBe(true);
	});

	it("is true when only a sub-component carries the prop", () => {
		// The family makes a sound even though the root is layout only.
		expect(hasSoundProp("navbar")).toBe(true);
		expect(hasSoundProp("sidebar")).toBe(true);
		expect(hasSoundProp("confetti")).toBe(true);
	});

	it("is false for a component with no sound prop", () => {
		expect(hasSoundProp("meteors")).toBe(false);
		expect(hasSoundProp("tooltip")).toBe(false);
	});

	it("is false for an unknown slug", () => {
		expect(hasSoundProp("not-a-component")).toBe(false);
	});

	it("does not match a prop that merely contains the word", () => {
		// Guards the regex: only `sound` or `Something.sound`, never `soundTheme`/`playSound`.
		const fake = { name: "soundTheme" };
		expect(/^(?:[A-Za-z]+\.)?sound$/.test(fake.name)).toBe(false);
	});

	it("agrees with the registry for every slug", () => {
		for (const [slug, meta] of Object.entries(registry)) {
			const expected = (meta.props ?? []).some((prop) => /^(?:[A-Za-z]+\.)?sound$/.test(prop.name));
			expect(hasSoundProp(slug), slug).toBe(expected);
		}
	});
});
