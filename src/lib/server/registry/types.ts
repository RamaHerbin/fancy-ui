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
	/** Who publishes the item, `name <url>`. */
	author?: string;
	categories?: string[];
	/** npm package names, unpinned. */
	dependencies?: string[];
	/** Type packages for `dependencies`, installed as dev dependencies. */
	devDependencies?: string[];
	/** Full URLs of other items of this registry. */
	registryDependencies?: string[];
	docs?: string;
	files: RegistryFile[];
	/** Licence and provenance: the npm package and version the files are a copy of. */
	meta?: RegistryItemMeta;
}

export interface RegistryItemMeta {
	license: string;
	/** npm package the sources are published in, e.g. `fancy-ui-react`. */
	package: string;
	/** That package's version at build time; compare with an installed copy to see what changed. */
	version: string;
	/** Docs page of the component (components only). */
	source?: string;
}

/** Licence and provenance stamped on every item. */
export interface Provenance {
	/** `author` field, `name <url>`. */
	author: string;
	license: string;
	package: string;
	version: string;
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
	 * package name → range the package is built against. When given, every
	 * dependency and devDependency is written `name@range` so the consumer's
	 * CLI installs the version the sources were written for, not the latest.
	 * A name with no entry stays bare.
	 */
	versions?: Readonly<Record<string, string>>;
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
	/** When given, every item carries `author` and `meta` (licence, package, version, docs page). */
	provenance?: Provenance;
}

export interface BuildOutput {
	index: RegistryIndex;
	items: Record<string, RegistryItem>;
}
