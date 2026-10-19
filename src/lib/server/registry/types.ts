/**
 * Shapes of the copy-into-your-project registries: per package, an index
 * (`<urlPath>/registry.json`) and one item per component or shared module
 * (`<urlPath>/<name>.json`).
 */

import type { RegistryStack } from "./stack.js";

export type RegistryItemType = "registry:ui" | "registry:lib";

export interface RegistryFile {
	/** Path in this repository, e.g. `react/src/components/rainbow-button/RainbowButton.tsx` (or a stack's steering path). */
	path: string;
	/** Source text; absent in the index. */
	content?: string;
	type: RegistryItemType;
	/** Where the file lands in the consumer project, e.g. `@ui/fancy/utils.ts`; absent when the stack leaves placement to the CLI. */
	target?: string;
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
	/** The package the files come from. Defaults to the React stack. */
	stack?: RegistryStack;
	/** path relative to the stack's source root (e.g. "components/rainbow-button/RainbowButton.tsx") → source */
	files: Record<string, string>;
	/** slug → { name, description, category } */
	meta: Record<string, ComponentMetaInput>;
	siteUrl: string;
	/**
	 * React only: names of server modules (relative to react/src, .js extension
	 * as in client-boundary). Empty by default: every module is a client module.
	 */
	serverModules?: ReadonlySet<string>;
	/**
	 * React only: strip the ".js" extension from relative import specifiers.
	 * Off by default in the pure function; the site turns it on (see
	 * sources.ts) because the Next bundlers do not map "./X.js" to X.tsx.
	 */
	stripJsExtension?: boolean;
}

export interface BuildOutput {
	index: RegistryIndex;
	items: Record<string, RegistryItem>;
}
