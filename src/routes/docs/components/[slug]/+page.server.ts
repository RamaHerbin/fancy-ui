import { getComponent } from "$lib/fancy-ui/registry.js";
import { FRAMEWORKS, type Framework } from "$lib/inspiration/types.js";
import { importNames, importNamesFor, reactImportNames } from "$lib/server/llms.js";
import { variantsFor } from "$lib/server/variants.js";
import { portCallbacksFor } from "$lib/server/port-callbacks.js";
import { vueModelsFor } from "$lib/server/vue-models.js";
import type { PageServerLoad } from "./$types";

// Resolved on the server (prerendered): the export names come from the package
// barrels and the copy lines from the registries, none of which may be
// bundled into the page.
export const load: PageServerLoad = ({ params }) => {
	const component = getComponent(params.slug);
	const variants = variantsFor(params.slug);

	// The Markdown edition of each framework, null when it has no port.
	const markdown = Object.fromEntries(
		FRAMEWORKS.map((framework) => [
			framework,
			component && importNamesFor(component, framework)
				? framework === "svelte"
					? `/docs/components/${params.slug}.md`
					: `/docs/components/${framework}/${params.slug}.md`
				: null,
		])
	) as Record<Framework, string | null>;

	return {
		importNames: component ? importNames(component) : [params.slug],
		reactImportNames: component ? reactImportNames(component) : null,
		// Each variant carries its copy tab (command and import), taken from the
		// registries the site serves.
		variants,
		markdown,
		// What the ports declare, so the API tables show the names they export.
		ports: {
			vueModels: component ? vueModelsFor(component.slug, component.name) : [],
			reactCallbacks: component ? portCallbacksFor("react", component.slug, component.name) : [],
			vueCallbacks: component ? portCallbacksFor("vue", component.slug, component.name) : [],
		},
	};
};
