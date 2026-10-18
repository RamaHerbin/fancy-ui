import { PUBLISHED } from "$lib/inspiration/catalog.js";
import { frameworksForAll } from "$lib/server/variants.js";
import type { PageServerLoad } from "./$types";

// Which entries are saved is only known in the browser; the page reads them
// from the catalog after mount. Only the barrel-derived badges come from here.
export const load: PageServerLoad = () => ({
	frameworks: frameworksForAll(PUBLISHED.flatMap((entry) => entry.components.map((c) => c.slug))),
});
