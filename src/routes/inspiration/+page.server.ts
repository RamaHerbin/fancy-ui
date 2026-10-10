import { PUBLISHED } from "$lib/inspiration/catalog.js";
import { frameworksForAll } from "$lib/server/variants.js";
import type { PageServerLoad } from "./$types";

// Framework badges come from the package barrels, which stay on the server:
// only the slug → frameworks map is baked into the page. The entries
// themselves come from the catalog, already in the client bundle.
export const load: PageServerLoad = () => ({
	frameworks: frameworksForAll(PUBLISHED.flatMap((entry) => entry.components.map((c) => c.slug))),
});
