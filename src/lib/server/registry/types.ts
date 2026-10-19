/**
 * Shapes of the copy-into-your-project registry: the index served at
 * `/r/registry.json` and the items served at `/r/<name>.json`.
 */

export type RegistryItemType = "registry:ui" | "registry:lib";

export interface RegistryFile {
	/** Path in this repository, e.g. `react/src/components/rainbow-button/RainbowButton.tsx`. */
	path: string;
	/** Source text; absent in the index. */
	content?: string;
	type: RegistryItemType;
	/** Where the file lands in the consumer project, e.g. `@ui/fancy/utils.ts`. */
	target: string;
}

export interface RegistryItem {
	$schema?: string;
	name: string;
	type: RegistryItemType;
	title: string;
	description: string;
	categories?: string[];
	/** npm package names, unpinned. */
	dependencies?: string[];
	/** Type packages for `dependencies`, installed as dev dependencies. */
	devDependencies?: string[];
	/** Full URLs of other items of this registry. */
	registryDependencies?: string[];
	docs?: string;
	files: RegistryFile[];
}

export interface RegistryIndex {
	$schema: string;
	name: string;
	homepage: string;
	items: RegistryItem[];
}

export interface ComponentMetaInput {
	name: string;
	description: string;
	category: string;
}

export interface BuildInput {
	/** path relative to react/src (e.g. "components/rainbow-button/RainbowButton.tsx") → source */
	files: Record<string, string>;
	/** slug → { name, description, category } */
	meta: Record<string, ComponentMetaInput>;
	siteUrl: string;
	/** names of server modules (relative to react/src, .js extension as in client-boundary) */
	serverModules: ReadonlySet<string>;
	/** when true, strip the ".js" extension from relative import specifiers (Gate C decision; default false) */
	stripJsExtension?: boolean;
}

export interface BuildOutput {
	index: RegistryIndex;
	items: Record<string, RegistryItem>;
}
