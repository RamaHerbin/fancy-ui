import { getComponent } from "$lib/fancy-ui/registry.js";
import { FRAMEWORKS, type Framework } from "$lib/inspiration/types.js";
import { importNames, importNamesFor, reactImportNames } from "$lib/server/llms.js";
import { variantsFor } from "$lib/server/variants.js";
import { copySourceFor } from "$lib/server/copy-availability.js";
import { portCallbacksFor } from "$lib/server/port-callbacks.js";
import { vueModelsFor } from "$lib/server/vue-models.js";
import type { PageServerLoad } from "./$types";

/** What the install block's copy tab prints for one framework. */
interface PageCopySource {
	command: string;
	importLine: string;
}

// Resolved on the server (prerendered): the export names come from the package
// barrels and the copy sources from the registries, none of which may be
// bundled into the page.
export const load: PageServerLoad = ({ params }) => {
	const component = getComponent(params.slug);
	const variants = variantsFor(params.slug);

	// The copy tab exists for a framework only when its registry ships the item.
	const copySource = Object.fromEntries(
		FRAMEWORKS.map((framework) => {
			const source = copySourceFor(params.slug, framework);
			const names = variants.find((v) => v.framework === framework)?.exports ?? [];
			return [
				framework,
				source && names.length
					? {
							command: source.command,
							importLine: `import { ${names.join(", ")} } from "${source.importPath}";`,
						}
					: null,
			];
		})
	) as Record<Framework, PageCopySource | null>;

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
		variants,
		copySource,
		markdown,
		// What the ports declare, so the API tables show the names they export.
		ports: {
			vueModels: component ? vueModelsFor(component.slug, component.name) : [],
			reactCallbacks: component ? portCallbacksFor("react", component.slug, component.name) : [],
			vueCallbacks: component ? portCallbacksFor("vue", component.slug, component.name) : [],
		},
	};
};
