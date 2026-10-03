import { describe, expect, it } from "vitest";
import {
	EMPTY_FILTERS,
	activeChips,
	applyFilters,
	clearFilters,
	facetCounts,
	hasActiveFilters,
	parseFilters,
	searchTerms,
	serializeFilters,
	toggleFacet,
	type Filters,
} from "./query.js";
import { STYLE_LABELS, type Reference } from "./types.js";

const base = (over: Partial<Reference> & Pick<Reference, "id" | "slug">): Reference =>
	({
		title: over.slug,
		summary: "",
		origin: "fancyui",
		kind: "interaction",
		creator: "FancyUI",
		sourceUrl: "https://example.com",
		addedAt: "2026-09-26",
		verifiedAt: "2026-09-26",
		status: "published",
		interactionTags: ["hover"],
		styleTags: ["glow"],
		useCaseTags: ["marketing"],
		codeAvailability: "open-source",
		analysis: { why: "", whenToUse: "", watch: "", clues: ["radial-gradient at pointer"] },
		components: [{ slug: "card-spotlight", relation: "exact" }],
		demo: { module: "x" },
		...over,
	}) as Reference;

const entries: Reference[] = [
	base({ id: "a", slug: "a", curatedRank: 2, addedAt: "2026-09-01" }),
	base({
		id: "b",
		slug: "b",
		curatedRank: 1,
		addedAt: "2026-08-01",
		styleTags: ["glass"],
		interactionTags: ["press", "hover"],
	}),
	base({
		id: "c",
		slug: "c",
		origin: "external",
		demo: undefined,
		creator: "Someone",
		product: "Product X",
		addedAt: "2026-09-30",
		styleTags: ["glow", "glass"],
		interactionTags: ["drag"],
		codeAvailability: "unknown",
		implementationFrameworks: ["react"],
		collections: ["glass-and-glow"],
		components: [{ slug: "pulse-beam", relation: "related", note: "close" }],
	}),
];

describe("parseFilters / serializeFilters", () => {
	it("round-trips a full state in canonical order", () => {
		const filters: Filters = {
			q: "glow",
			origin: ["external"],
			kind: [],
			interaction: ["press", "hover"],
			style: ["glass"],
			framework: ["react"],
			code: [],
			collection: "glass-and-glow",
			sort: "latest",
		};
		const query = serializeFilters(filters);
		expect(query).toBe(
			"?q=glow&origin=external&interaction=hover%2Cpress&style=glass&framework=react&collection=glass-and-glow&sort=latest"
		);
		expect(parseFilters(new URLSearchParams(query))).toEqual({
			...filters,
			interaction: ["hover", "press"],
		});
	});

	it("omits defaults and serialises an empty state to an empty string", () => {
		expect(serializeFilters({ ...EMPTY_FILTERS })).toBe("");
		expect(serializeFilters({ ...EMPTY_FILTERS, sort: "curated" })).toBe("");
	});

	it("drops unknown keys and values without throwing", () => {
		const parsed = parseFilters(
			new URLSearchParams("?style=glow,neon,,glass&kind=flow&sort=random&collection=nope&foo=1")
		);
		expect(parsed.style).toEqual(["glass", "glow"]);
		expect(parsed.kind).toEqual([]);
		expect(parsed.sort).toBe("curated");
		expect(parsed.collection).toBeNull();
	});

	it("dedupes and sorts facet values", () => {
		expect(parseFilters(new URLSearchParams("?interaction=press,hover,press")).interaction).toEqual(
			["hover", "press"]
		);
	});

	it("trims and caps the query", () => {
		expect(parseFilters(new URLSearchParams(`?q=${"x".repeat(100)}`)).q).toHaveLength(80);
		expect(parseFilters(new URLSearchParams("?q=%20%20hi%20")).q).toBe("hi");
	});
});

describe("toggleFacet / clearFilters / activeChips", () => {
	it("toggles a value on and off, keeping values sorted", () => {
		let f = toggleFacet({ ...EMPTY_FILTERS }, "style", "glow");
		f = toggleFacet(f, "style", "glass");
		expect(f.style).toEqual(["glass", "glow"]);
		expect(toggleFacet(f, "style", "glow").style).toEqual(["glass"]);
	});

	it("clear keeps the sort but drops everything else", () => {
		const f: Filters = { ...EMPTY_FILTERS, q: "x", style: ["glow"], sort: "latest" };
		expect(hasActiveFilters(f)).toBe(true);
		const cleared = clearFilters(f);
		expect(hasActiveFilters(cleared)).toBe(false);
		expect(cleared.sort).toBe("latest");
	});

	it("lists one chip per active value, query first", () => {
		const f: Filters = {
			...EMPTY_FILTERS,
			q: "x",
			style: ["glow"],
			interaction: ["press"],
			collection: "ai-interfaces",
		};
		expect(activeChips(f)).toEqual([
			{ facet: "q", value: "x" },
			{ facet: "interaction", value: "press" },
			{ facet: "style", value: "glow" },
			{ facet: "collection", value: "ai-interfaces" },
		]);
	});
});

describe("applyFilters", () => {
	it("ORs inside a facet and ANDs across facets", () => {
		const glowOrGlass = applyFilters(entries, { ...EMPTY_FILTERS, style: ["glow", "glass"] });
		expect(glowOrGlass.map((e) => e.id)).toEqual(["b", "a", "c"]);
		const glassAndDrag = applyFilters(entries, {
			...EMPTY_FILTERS,
			style: ["glass"],
			interaction: ["drag"],
		});
		expect(glassAndDrag.map((e) => e.id)).toEqual(["c"]);
	});

	it("searches title, creator, product, tags, clues and component slugs", () => {
		expect(applyFilters(entries, { ...EMPTY_FILTERS, q: "product x" }).map((e) => e.id)).toEqual([
			"c",
		]);
		expect(applyFilters(entries, { ...EMPTY_FILTERS, q: "pulse-beam" }).map((e) => e.id)).toEqual([
			"c",
		]);
		expect(applyFilters(entries, { ...EMPTY_FILTERS, q: "radial" })).toHaveLength(3);
		expect(applyFilters(entries, { ...EMPTY_FILTERS, q: "zzz" })).toHaveLength(0);
	});

	it("filters frameworks: fancyui entries match all three, external ones only verified ports", () => {
		expect(
			applyFilters(entries, { ...EMPTY_FILTERS, framework: ["vue"] }).map((e) => e.id)
		).toEqual(["b", "a"]);
		expect(applyFilters(entries, { ...EMPTY_FILTERS, framework: ["react"] })).toHaveLength(3);
	});

	it("sorts curated by rank then date, latest by date", () => {
		expect(applyFilters(entries, { ...EMPTY_FILTERS }).map((e) => e.id)).toEqual(["b", "a", "c"]);
		expect(applyFilters(entries, { ...EMPTY_FILTERS, sort: "latest" }).map((e) => e.id)).toEqual([
			"c",
			"a",
			"b",
		]);
	});

	it("is deterministic", () => {
		const f: Filters = { ...EMPTY_FILTERS, q: "a" };
		expect(applyFilters(entries, f)).toEqual(applyFilters(entries, f));
	});
});

describe("facetCounts", () => {
	it("counts values over the catalog and drops empty ones", () => {
		expect(facetCounts(entries, "style", STYLE_LABELS)).toEqual([
			{ value: "glow", label: "Glow", count: 2 },
			{ value: "glass", label: "Glass", count: 2 },
		]);
		expect(facetCounts(entries, "code", {}).map((c) => c.value)).toEqual([
			"open-source",
			"unknown",
		]);
	});
});

describe("searchTerms / sentence search", () => {
	it("drops stop words and splits on punctuation", () => {
		expect(searchTerms("A button that glows, on hover!")).toEqual(["button", "glows", "hover"]);
	});

	it("matches every term, by the word or its stem", () => {
		expect(applyFilters(entries, { ...EMPTY_FILTERS, q: "glowing radial" })).toHaveLength(2);
		expect(applyFilters(entries, { ...EMPTY_FILTERS, q: "glowing radial zebra" })).toHaveLength(0);
	});
});
