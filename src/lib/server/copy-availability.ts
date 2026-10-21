/**
 * Which component pages can offer the copy-into-your-project install, per
 * framework, and what that install prints: the registry item URL, the command
 * and the folder to import from afterwards.
 *
 * The answer comes from the three registries the site serves (`/r`,
 * `/r/svelte`, `/r/vue`), not from the package barrels: a page only offers a
 * copy source when that stack really ships an item of that name. Most items
 * are component folders; the sound page documents a shared module, which the
 * CLI writes next to the components folder rather than inside it, so its
 * import path differs.
 */

import { getComponent } from "$lib/fancy-ui/registry.js";
import {
	COPY_IMPORT_ROOT,
	COPY_IMPORT_ROOT_SVELTE,
	COPY_IMPORT_ROOT_VUE,
	REGISTRY_BASE,
	REGISTRY_BASE_SVELTE,
	REGISTRY_BASE_VUE,
	copyCommandFor,
} from "$lib/copy-source.js";
import { FRAMEWORKS, type Framework } from "$lib/inspiration/types.js";
import type { BuildOutput } from "./registry/build.js";
import { registryOutput, svelteRegistryOutput, vueRegistryOutput } from "./registry/sources.js";
import type { RegistryStack } from "./registry/stack.js";
import { reactStack } from "./registry/stacks/react.js";
import { svelteStack } from "./registry/stacks/svelte.js";
import { vueStack } from "./registry/stacks/vue.js";

export interface CopySource {
	/** The registry item, e.g. `https://…/r/vue/border-beam.json`. */
	url: string;
	/** The one-line command that copies it into a project. */
	command: string;
	/** Where the copied module is imported from, e.g. `@/components/ui/fancy/components/border-beam`. */
	importPath: string;
}

interface StackInfo {
	output(): BuildOutput;
	stack: RegistryStack;
	base: string;
	/** Import root of a component item. */
	componentRoot: string;
	/** Import root of a shared module (written next to the components folder). */
	sharedRoot: string;
}

const STACKS: Record<Framework, StackInfo> = {
	svelte: {
		output: svelteRegistryOutput,
		stack: svelteStack,
		base: REGISTRY_BASE_SVELTE,
		componentRoot: COPY_IMPORT_ROOT_SVELTE,
		sharedRoot: COPY_IMPORT_ROOT_SVELTE,
	},
	react: {
		output: registryOutput,
		stack: reactStack,
		base: REGISTRY_BASE,
		componentRoot: COPY_IMPORT_ROOT,
		sharedRoot: COPY_IMPORT_ROOT.replace(/\/components$/, ""),
	},
	vue: {
		output: vueRegistryOutput,
		stack: vueStack,
		base: REGISTRY_BASE_VUE,
		componentRoot: COPY_IMPORT_ROOT_VUE,
		sharedRoot: COPY_IMPORT_ROOT_VUE.replace(/\/components$/, ""),
	},
};

/** The copy source of a component page for one framework, or null when that stack ships none. */
export function copySourceFor(slug: string, framework: Framework): CopySource | null {
	if (!getComponent(slug)) return null;
	const info = STACKS[framework];
	if (!Object.hasOwn(info.output().items, slug)) return null;
	const root = info.stack.isComponent(slug) ? info.componentRoot : info.sharedRoot;
	return {
		url: `${info.base}/${slug}.json`,
		command: copyCommandFor(slug, framework),
		importPath: `${root}/${slug}`,
	};
}

/** The copy source of a component page for every framework, in canonical order. */
export function copySourcesFor(slug: string): Record<Framework, CopySource | null> {
	return Object.fromEntries(
		FRAMEWORKS.map((framework) => [framework, copySourceFor(slug, framework)])
	) as Record<Framework, CopySource | null>;
}
