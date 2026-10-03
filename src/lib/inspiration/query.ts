/**
 * Gallery state ↔ URL. Pure functions, no SvelteKit imports, so the page can
 * stay prerendered and the tests need no browser.
 *
 * Semantics: OR inside a facet (`?style=glow,glass` = glow or glass), AND
 * across facets, substring search on `q`. Serialisation is canonical (fixed
 * key order, sorted values, defaults omitted) so two visitors who pick the
 * same filters share the same URL.
 */

import {
	CODE_AVAILABILITY,
	COLLECTIONS,
	FRAMEWORKS,
	INTERACTIONS,
	KINDS,
	ORIGINS,
	SORTS,
	STYLES,
	type CodeAvailability,
	type Collection,
	type Framework,
	type Interaction,
	type Kind,
	type Origin,
	type Reference,
	type Sort,
	type Style,
} from "./types.js";

export interface Filters {
	q: string;
	origin: Origin[];
	kind: Kind[];
	interaction: Interaction[];
	style: Style[];
	framework: Framework[];
	code: CodeAvailability[];
	collection: Collection | null;
	sort: Sort;
}

/** The multi-value facets, in the order they are serialised. */
export const FACETS = ["origin", "kind", "interaction", "style", "framework", "code"] as const;
export type Facet = (typeof FACETS)[number];

const FACET_VALUES: Record<Facet, readonly string[]> = {
	origin: ORIGINS,
	kind: KINDS,
	interaction: INTERACTIONS,
	style: STYLES,
	framework: FRAMEWORKS,
	code: CODE_AVAILABILITY,
};

/** URL parameter names, in canonical order. */
const KEYS = ["q", ...FACETS, "collection", "sort"] as const;

export const EMPTY_FILTERS: Readonly<Filters> = Object.freeze({
	q: "",
	origin: [],
	kind: [],
	interaction: [],
	style: [],
	framework: [],
	code: [],
	collection: null,
	sort: "curated",
});

function parseList(facet: Facet, raw: string | null): string[] {
	if (!raw) return [];
	const allowed = FACET_VALUES[facet];
	const seen = new Set<string>();
	for (const part of raw.split(",")) {
		const value = part.trim();
		if (value && allowed.includes(value)) seen.add(value);
	}
	return [...seen].sort();
}

/** Reads a URL; unknown keys and values are ignored, never thrown on. */
export function parseFilters(params: URLSearchParams): Filters {
	const collection = params.get("collection");
	const sort = params.get("sort");
	return {
		q: (params.get("q") ?? "").trim().slice(0, 80),
		origin: parseList("origin", params.get("origin")) as Origin[],
		kind: parseList("kind", params.get("kind")) as Kind[],
		interaction: parseList("interaction", params.get("interaction")) as Interaction[],
		style: parseList("style", params.get("style")) as Style[],
		framework: parseList("framework", params.get("framework")) as Framework[],
		code: parseList("code", params.get("code")) as CodeAvailability[],
		collection:
			collection && (COLLECTIONS as readonly string[]).includes(collection)
				? (collection as Collection)
				: null,
		sort: sort && (SORTS as readonly string[]).includes(sort) ? (sort as Sort) : "curated",
	};
}

/** Writes the query string (including the leading `?`), or "" when nothing is set. */
export function serializeFilters(filters: Filters): string {
	const params = new URLSearchParams();
	for (const key of KEYS) {
		if (key === "q") {
			const q = filters.q.trim();
			if (q) params.set("q", q);
		} else if (key === "collection") {
			if (filters.collection) params.set("collection", filters.collection);
		} else if (key === "sort") {
			if (filters.sort !== "curated") params.set("sort", filters.sort);
		} else {
			const values = [...filters[key]].sort();
			if (values.length) params.set(key, values.join(","));
		}
	}
	const out = params.toString();
	return out ? `?${out}` : "";
}

/** Adds or removes one facet value. */
export function toggleFacet<F extends Facet>(
	filters: Filters,
	facet: F,
	value: Filters[F][number]
): Filters {
	const current = filters[facet] as string[];
	const next = current.includes(value)
		? current.filter((entry) => entry !== value)
		: [...current, value].sort();
	return { ...filters, [facet]: next };
}

export function clearFilters(filters: Filters): Filters {
	// Sort is a view preference, not a filter: a reset keeps it.
	return { ...EMPTY_FILTERS, sort: filters.sort };
}

export function hasActiveFilters(filters: Filters): boolean {
	return (
		filters.q.trim() !== "" ||
		filters.collection !== null ||
		FACETS.some((facet) => filters[facet].length > 0)
	);
}

/** One chip per active value, in facet order — what the "active filters" row renders. */
export function activeChips(
	filters: Filters
): { facet: Facet | "q" | "collection"; value: string }[] {
	const chips: { facet: Facet | "q" | "collection"; value: string }[] = [];
	if (filters.q.trim()) chips.push({ facet: "q", value: filters.q.trim() });
	for (const facet of FACETS) for (const value of filters[facet]) chips.push({ facet, value });
	if (filters.collection) chips.push({ facet: "collection", value: filters.collection });
	return chips;
}

// ─── Matching ──────────────────────────────────────────────────────────────

function haystack(entry: Reference): string {
	return [
		entry.title,
		entry.summary,
		entry.creator,
		entry.product ?? "",
		...entry.interactionTags,
		...entry.styleTags,
		...entry.useCaseTags,
		...entry.analysis.clues,
		...entry.components.map((link) => link.slug),
	]
		.join(" ")
		.toLowerCase();
}

/**
 * Frameworks an entry can be filtered by: for FancyUI references the three
 * library ports (resolved by the caller from the barrels), for external ones
 * the verified implementation frameworks.
 */
export type FrameworkIndex = (entry: Reference) => readonly Framework[];

const defaultFrameworkIndex: FrameworkIndex = (entry) =>
	entry.origin === "fancyui" ? FRAMEWORKS : (entry.implementationFrameworks ?? []);

function matchesFacet(values: readonly string[], have: readonly string[]): boolean {
	return values.length === 0 || values.some((value) => have.includes(value));
}

/** Words that carry no meaning in a gallery search ("a button that glows"). */
const STOPWORDS = new Set(
	"a an the that which with for of to on in into and or when i my me it its is are be by as at this these those something some like".split(
		" "
	)
);

/** Plain-English endings, so "glowing", "glows" and "glowed" all find "glow". */
function stem(word: string): string {
	for (const suffix of ["ing", "ed", "es", "s"]) {
		if (word.length > suffix.length + 2 && word.endsWith(suffix))
			return word.slice(0, -suffix.length);
	}
	return word;
}

/**
 * The search terms of a query: lower-cased words, stop words dropped. Every
 * term must appear (AND), each one either as typed or by its stem, so a
 * sentence finds what a single keyword would.
 */
export function searchTerms(q: string): string[] {
	return q
		.toLowerCase()
		.split(/[^\p{L}\p{N}-]+/u)
		.filter((word) => word.length > 0 && !STOPWORDS.has(word));
}

function matchesText(text: string, terms: readonly string[]): boolean {
	return terms.every((term) => text.includes(term) || text.includes(stem(term)));
}

export function matches(
	entry: Reference,
	filters: Filters,
	frameworksOf: FrameworkIndex = defaultFrameworkIndex
): boolean {
	const terms = searchTerms(filters.q);
	if (terms.length > 0 && !matchesText(haystack(entry), terms)) return false;
	if (!matchesFacet(filters.origin, [entry.origin])) return false;
	if (!matchesFacet(filters.kind, [entry.kind])) return false;
	if (!matchesFacet(filters.interaction, entry.interactionTags)) return false;
	if (!matchesFacet(filters.style, entry.styleTags)) return false;
	if (!matchesFacet(filters.framework, frameworksOf(entry))) return false;
	if (!matchesFacet(filters.code, [entry.codeAvailability])) return false;
	if (filters.collection && !(entry.collections ?? []).includes(filters.collection)) return false;
	return true;
}

/** Curated: ranked first (ascending), then newest; ties keep catalog order. Latest: newest first. */
export function sortEntries(entries: readonly Reference[], sort: Sort): Reference[] {
	const items = [...entries];
	if (sort === "latest") {
		return items.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
	}
	return items.sort((a, b) => {
		const ra = a.curatedRank ?? Number.POSITIVE_INFINITY;
		const rb = b.curatedRank ?? Number.POSITIVE_INFINITY;
		if (ra !== rb) return ra - rb;
		return b.addedAt.localeCompare(a.addedAt);
	});
}

/** The one function the gallery's `$derived` calls. Deterministic. */
export function applyFilters(
	entries: readonly Reference[],
	filters: Filters,
	frameworksOf?: FrameworkIndex
): Reference[] {
	return sortEntries(
		entries.filter((entry) => matches(entry, filters, frameworksOf)),
		filters.sort
	);
}

export interface FacetCount {
	value: string;
	label: string;
	count: number;
}

/**
 * Counts per facet value over the given entries (usually the published set,
 * so the chips reflect the catalog, not the current result). Zero-count
 * values are dropped: the gallery only offers filters that lead somewhere.
 */
export function facetCounts(
	entries: readonly Reference[],
	facet: Facet,
	labels: Record<string, string>,
	frameworksOf: FrameworkIndex = defaultFrameworkIndex
): FacetCount[] {
	const counts = new Map<string, number>();
	for (const entry of entries) {
		const values: readonly string[] =
			facet === "origin"
				? [entry.origin]
				: facet === "kind"
					? [entry.kind]
					: facet === "interaction"
						? entry.interactionTags
						: facet === "style"
							? entry.styleTags
							: facet === "framework"
								? frameworksOf(entry)
								: [entry.codeAvailability];
		for (const value of new Set(values)) counts.set(value, (counts.get(value) ?? 0) + 1);
	}
	return FACET_VALUES[facet]
		.filter((value) => (counts.get(value) ?? 0) > 0)
		.map((value) => ({ value, label: labels[value] ?? value, count: counts.get(value)! }));
}
