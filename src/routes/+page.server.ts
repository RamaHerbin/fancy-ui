import { featured, collections, PUBLISHED } from "$lib/inspiration/catalog.js";
import type { Reference } from "$lib/inspiration/types.js";
import { frameworksForAll } from "$lib/server/variants.js";
import { COMPONENT_COUNT } from "$lib/site.js";
import type { PageServerLoad } from "./$types";

/** Every library slug a set of references points at, exact or related. */
function componentSlugsOf(entries: readonly Reference[]): string[] {
	return entries.flatMap((entry) => entry.components.map((link) => link.slug));
}

export const load: PageServerLoad = () => {
	const picks = featured(11);
	return {
		featured: picks,
		collections: collections(),
		frameworks: frameworksForAll(componentSlugsOf(picks)),
		stats: {
			// Same figure as the docs pages, so the two never disagree.
			components: COMPONENT_COUNT,
			published: PUBLISHED.length,
		},
	};
};
