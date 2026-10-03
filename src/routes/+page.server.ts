import { featured, collections, PUBLISHED } from "$lib/inspiration/catalog.js";
import type { Reference } from "$lib/inspiration/types.js";
import { frameworksForAll } from "$lib/server/variants.js";
import { getAllComponents } from "$lib/fancy-ui/registry.js";
import type { PageServerLoad } from "./$types";

/** Every library slug a set of references points at, exact or related. */
function componentSlugsOf(entries: readonly Reference[]): string[] {
	return entries.flatMap((entry) => entry.components.map((link) => link.slug));
}

export const load: PageServerLoad = () => {
	const picks = featured(6);
	// "sound" is the shared sound controller, not a component a visitor installs.
	const slugs = [...new Set(getAllComponents().map((component) => component.slug))].filter(
		(slug) => slug !== "sound"
	);
	return {
		featured: picks,
		collections: collections(),
		frameworks: frameworksForAll(componentSlugsOf(picks)),
		stats: {
			components: slugs.length,
			published: PUBLISHED.length,
		},
	};
};
