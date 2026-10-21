import { getComponent } from "$lib/fancy-ui/registry.js";
import { importNames, reactImportNames } from "$lib/server/llms.js";
import { variantsFor } from "$lib/server/variants.js";
import { portCallbacksFor } from "$lib/server/port-callbacks.js";
import { vueModelsFor } from "$lib/server/vue-models.js";
import type { PageServerLoad } from "./$types";

// Resolved on the server (prerendered): the export names come from the package
// barrels, which must not be bundled into the page.
export const load: PageServerLoad = ({ params }) => {
	const component = getComponent(params.slug);
	return {
		importNames: component ? importNames(component) : [params.slug],
		reactImportNames: component ? reactImportNames(component) : null,
		variants: variantsFor(params.slug),
		// What the ports declare, so the API tables show the names they export.
		ports: {
			vueModels: component ? vueModelsFor(component.slug, component.name) : [],
			reactCallbacks: component ? portCallbacksFor("react", component.slug, component.name) : [],
			vueCallbacks: component ? portCallbacksFor("vue", component.slug, component.name) : [],
		},
	};
};
