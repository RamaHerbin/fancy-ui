import { describe, expect, it } from "vitest";
import { hasComponent } from "$lib/fancy-ui/registry.js";
import { FINDS, filterFinds, gesturesWithCounts, getFind, getFinds, searchFinds } from "./finds.js";
import { GESTURES } from "./types.js";

const demoModules = Object.keys(import.meta.glob("$lib/finds/demos/*.svelte"));
const live = FINDS.filter((find) => find.kind === "live");
const external = FINDS.filter((find) => find.kind === "external");

describe("finds catalog", () => {
	it("has unique ids", () => {
		const ids = FINDS.map((find) => find.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("only uses known gestures and non-empty readings", () => {
		for (const find of FINDS) {
			expect(GESTURES).toContain(find.gesture);
			expect(find.why.length).toBeGreaterThan(10);
			expect(find.clues.length).toBeGreaterThanOrEqual(2);
			expect(find.added).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		}
	});

	it("every live find points at a registry component", () => {
		for (const find of live) {
			expect(hasComponent(find.slug), `${find.id} → ${find.slug}`).toBe(true);
		}
	});

	it("every live find has a demo module", () => {
		for (const find of live) {
			expect(demoModules, `${find.id} needs src/lib/finds/demos/${find.demo}.svelte`).toContain(
				`/src/lib/finds/demos/${find.demo}.svelte`
			);
		}
	});

	it("every knob has a default value", () => {
		for (const find of live) {
			for (const knob of find.knobs ?? []) {
				expect(find.defaults, `${find.id}.defaults`).toBeDefined();
				expect(find.defaults!, `${find.id}.defaults.${knob.key}`).toHaveProperty(knob.key);
			}
		}
	});

	it("external finds link to https sources and local media only", () => {
		expect(external.length).toBeGreaterThan(0);
		for (const find of external) {
			expect(find.source.url).toMatch(/^https:\/\//);
			if (find.media) expect(find.media.src).toMatch(/^\/finds\//);
		}
	});
});

describe("finds helpers", () => {
	it("getFinds puts featured first, then newest", () => {
		const sorted = getFinds();
		const firstNonFeatured = sorted.findIndex((find) => !find.featured);
		expect(sorted.slice(0, firstNonFeatured).every((find) => find.featured)).toBe(true);
		const rest = sorted.slice(firstNonFeatured).map((find) => find.added);
		expect(rest).toEqual([...rest].sort().reverse());
	});

	it("getFind finds by id", () => {
		expect(getFind("magnetic-button")?.title).toContain("magnetic");
		expect(getFind("nope")).toBeUndefined();
	});

	it("gesturesWithCounts sums to the catalog and omits empty gestures", () => {
		const counts = gesturesWithCounts();
		expect(counts.reduce((sum, entry) => sum + entry.count, 0)).toBe(FINDS.length);
		expect(counts.every((entry) => entry.count > 0)).toBe(true);
		expect(counts.map((entry) => entry.gesture)).toEqual(
			GESTURES.filter((gesture) => FINDS.some((find) => find.gesture === gesture))
		);
	});

	it("searchFinds matches clues and tags case-insensitively, empty query returns all", () => {
		expect(searchFinds("").length).toBe(FINDS.length);
		const spring = searchFinds("SPRING");
		expect(spring.length).toBeGreaterThan(0);
		expect(spring.every((find) => JSON.stringify(find).toLowerCase().includes("spring"))).toBe(
			true
		);
	});

	it("filterFinds combines gesture, query and saved ids", () => {
		expect(filterFinds({ gesture: "ambient" }).every((find) => find.gesture === "ambient")).toBe(
			true
		);
		expect(filterFinds({ gesture: "all", query: "zzz-nothing" })).toEqual([]);
		const ids = new Set(["meteors", "linear-command-menu"]);
		expect(
			filterFinds({ ids })
				.map((find) => find.id)
				.sort()
		).toEqual([...ids].sort());
		expect(filterFinds({ ids, gesture: "type" }).map((find) => find.id)).toEqual([
			"linear-command-menu",
		]);
	});
});
