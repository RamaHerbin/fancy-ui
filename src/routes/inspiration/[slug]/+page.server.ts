import { error } from "@sveltejs/kit";
import { getComponent } from "$lib/fancy-ui/registry.js";
import { PUBLISHED, getPublished } from "$lib/inspiration/catalog.js";
import { frameworksForAll, variantsForAll } from "$lib/server/variants.js";
import type { PageServerLoad } from "./$types";

/** Up to three published neighbours sharing a style or an interaction tag. */
function relatedTo(slug: string) {
	const entry = getPublished(slug)!;
	return PUBLISHED.filter(
		(other) =>
			other.id !== entry.id &&
			(other.styleTags.some((tag) => entry.styleTags.includes(tag)) ||
				other.interactionTags.some((tag) => entry.interactionTags.includes(tag)))
	)
		.map((other) => ({
			other,
			score:
				other.styleTags.filter((tag) => entry.styleTags.includes(tag)).length * 2 +
				other.interactionTags.filter((tag) => entry.interactionTags.includes(tag)).length,
		}))
		.sort((a, b) => b.score - a.score)
		.slice(0, 3)
		.map(({ other }) => other.slug);
}

// Variant tables and names are resolved here (prerendered): the barrels and
// the registry's export lists stay on the server.
export const load: PageServerLoad = ({ params }) => {
	const entry = getPublished(params.slug);
	if (!entry) error(404, "Reference not found");
	const slugs = entry.components.map((link) => link.slug);
	const related = relatedTo(entry.slug);
	const relatedSlugs = related.flatMap(
		(slug) => getPublished(slug)?.components.map((c) => c.slug) ?? []
	);
	return {
		variants: variantsForAll(slugs),
		names: Object.fromEntries(slugs.map((slug) => [slug, getComponent(slug)?.name ?? slug])),
		related,
		frameworks: frameworksForAll(relatedSlugs),
	};
};
