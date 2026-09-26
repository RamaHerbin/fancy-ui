import { getComponent } from "$lib/fancy-ui/registry.js";
import { importNames, reactImportNames } from "$lib/server/llms.js";
import type { PageServerLoad } from "./$types";

// Resolved on the server (prerendered): the export names come from the package
// barrels, which must not be bundled into the page.
export const load: PageServerLoad = ({ params }) => {
	const component = getComponent(params.slug);
	return {
		importNames: component ? importNames(component) : [params.slug],
		reactImportNames: component ? reactImportNames(component) : null,
	};
};
