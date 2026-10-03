/**
 * Display helpers shared by the card, the detail page and the gallery
 * toolbar: origin badge, facet labels, and which framework badges a card
 * lights.
 */

import type { Facet } from "$lib/inspiration/query.js";
import {
	CODE_AVAILABILITY_LABELS,
	FRAMEWORK_LABELS,
	INTERACTION_LABELS,
	KIND_LABELS,
	STYLE_LABELS,
	type Framework,
	type Reference,
} from "$lib/inspiration/types.js";

/** Badge text: our own components, open-source work from elsewhere, or anything else. */
export function originBadge(entry: Reference): "FANCYUI" | "COMMUNITY" | "EXTERNAL" {
	if (entry.origin === "fancyui") return "FANCYUI";
	return entry.codeAvailability === "open-source" ? "COMMUNITY" : "EXTERNAL";
}

export const ORIGIN_LABELS: Record<string, string> = {
	fancyui: "FancyUI",
	external: "External",
};

export const FACET_LABELS: Record<Facet, Record<string, string>> = {
	origin: ORIGIN_LABELS,
	kind: KIND_LABELS,
	interaction: INTERACTION_LABELS,
	style: STYLE_LABELS,
	framework: FRAMEWORK_LABELS,
	code: CODE_AVAILABILITY_LABELS,
};

export const FACET_TITLES: Record<Facet | "q" | "collection", string> = {
	q: "Search",
	origin: "Origin",
	kind: "Type",
	interaction: "Interaction",
	style: "Style",
	framework: "Framework",
	code: "Code",
	collection: "Collection",
};

/** Order the toolbar shows the facet groups in. */
export const TOOLBAR_FACETS: Facet[] = [
	"interaction",
	"style",
	"origin",
	"framework",
	"code",
	"kind",
];

/** Badge order on cards. */
export const BADGE_ORDER: Framework[] = ["react", "svelte", "vue"];

/**
 * Frameworks a card lights: for a FancyUI reference, the ports of the
 * components it *is* (`exact`); for an external one, the verified
 * implementation frameworks. `ports` is the server-baked slug → frameworks map.
 */
export function cardFrameworks(
	entry: Reference,
	ports: Record<string, readonly Framework[]>
): Framework[] {
	if (entry.origin === "external") return [...(entry.implementationFrameworks ?? [])];
	const out = new Set<Framework>();
	for (const link of entry.components) {
		if (link.relation !== "exact") continue;
		for (const fw of ports[link.slug] ?? []) out.add(fw);
	}
	return [...out];
}

/** Up to two tags for a card: the first style, then the first interaction. */
export function cardTags(entry: Reference): string[] {
	const tags: (string | undefined)[] = [entry.styleTags[0], entry.interactionTags[0]];
	return tags.filter((tag): tag is string => Boolean(tag));
}
