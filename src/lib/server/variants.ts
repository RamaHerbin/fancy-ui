/**
 * Framework variants of a library component — what the site prints when a
 * visitor picks React, Svelte or Vue: package, export names, import line,
 * where to read more, and whether the variant can actually be installed.
 *
 * Everything is derived at build time from the registry and the three
 * packages' barrels (see barrels.ts), then baked into the prerendered pages'
 * data. The barrels never reach the client. No per-component code sample is
 * kept here on purpose: the docs examples are Svelte, and a React or Vue
 * variant must never show another framework's code.
 */

import { getComponent } from "$lib/fancy-ui/registry.js";
import { FRAMEWORKS, type Framework } from "$lib/inspiration/types.js";
import {
	GITHUB_URL,
	PACKAGE_NAME,
	REACT_PACKAGE_GITHUB_URL,
	REACT_PACKAGE_NAME,
	REACT_PACKAGE_URL,
	VUE_PACKAGE_GITHUB_URL,
	VUE_PACKAGE_NAME,
	VUE_PACKAGE_PUBLISHED,
	VUE_PACKAGE_URL,
} from "$lib/site.js";
import { reactExportsBySlug, svelteExportsBySlug, vueExportsBySlug } from "./barrels.js";

export type Availability =
	/** On npm, importable today. */
	| "available"
	/** Ported in the repo, package not yet on npm. */
	| "source-only"
	/** No port of this component in that framework. */
	| "unavailable";

export interface FrameworkVariant {
	framework: Framework;
	package: string;
	/** Value exports of the component folder in that package; [] when unavailable. */
	exports: string[];
	/** `import { X } from "pkg";` or null when unavailable. */
	importLine: string | null;
	/** One-line install command, or null when the package cannot be installed yet. */
	installLine: string | null;
	/** Where to read the API for this framework. */
	docsUrl: string;
	/** Where the port's source lives. */
	sourceUrl: string;
	/** npm page or package folder. */
	packageUrl: string;
	availability: Availability;
	/** Human note shown next to a non-available variant. */
	note: string | null;
}

const PACKAGES: Record<
	Framework,
	{ name: string; url: string; source: string; published: boolean }
> = {
	svelte: {
		name: PACKAGE_NAME,
		url: `https://www.npmjs.com/package/${PACKAGE_NAME}`,
		source: `${GITHUB_URL}/tree/main/src/lib/fancy-ui`,
		published: true,
	},
	react: {
		name: REACT_PACKAGE_NAME,
		url: REACT_PACKAGE_URL,
		source: REACT_PACKAGE_GITHUB_URL,
		published: true,
	},
	vue: {
		name: VUE_PACKAGE_NAME,
		url: VUE_PACKAGE_URL,
		source: VUE_PACKAGE_GITHUB_URL,
		published: VUE_PACKAGE_PUBLISHED,
	},
};

const EXPORTS: Record<Framework, ReadonlyMap<string, string[]>> = {
	svelte: svelteExportsBySlug,
	react: reactExportsBySlug,
	vue: vueExportsBySlug,
};

/** The names to import: the registry name when it is exported, else every value export. */
function namesFor(framework: Framework, slug: string): string[] {
	const exported = EXPORTS[framework].get(slug) ?? [];
	const registryName = getComponent(slug)?.name;
	if (registryName && exported.includes(registryName)) return [registryName];
	return exported;
}

export function variantFor(slug: string, framework: Framework): FrameworkVariant {
	const pkg = PACKAGES[framework];
	const exports = namesFor(framework, slug);
	const docsUrl = `/docs/components/${slug}`;
	const sourceUrl =
		framework === "svelte" ? `${pkg.source}/${slug}` : `${pkg.source}/src/components/${slug}`;
	if (exports.length === 0) {
		return {
			framework,
			package: pkg.name,
			exports: [],
			importLine: null,
			installLine: null,
			docsUrl,
			sourceUrl: pkg.source,
			packageUrl: pkg.url,
			availability: "unavailable",
			note: `No ${framework === "svelte" ? "Svelte" : framework === "react" ? "React" : "Vue"} port of this component yet.`,
		};
	}
	const importLine = `import { ${exports.join(", ")} } from "${pkg.name}";`;
	if (!pkg.published) {
		return {
			framework,
			package: pkg.name,
			exports,
			importLine,
			installLine: null,
			docsUrl,
			sourceUrl,
			packageUrl: pkg.url,
			availability: "source-only",
			note: `${pkg.name} is not on npm yet — the port lives in the repository.`,
		};
	}
	return {
		framework,
		package: pkg.name,
		exports,
		importLine,
		installLine: `pnpm add ${pkg.name}`,
		docsUrl,
		sourceUrl,
		packageUrl: pkg.url,
		availability: "available",
		note: null,
	};
}

/** All three variants, always in canonical order (svelte, react, vue). */
export function variantsFor(slug: string): FrameworkVariant[] {
	return FRAMEWORKS.map((framework) => variantFor(slug, framework));
}

/** Frameworks that have a port (available or source-only) — the card badges. */
export function frameworksFor(slug: string): Framework[] {
	return FRAMEWORKS.filter((framework) => namesFor(framework, slug).length > 0);
}

/** Badge data for a set of component slugs, small enough to bake into page data. */
export function frameworksForAll(slugs: Iterable<string>): Record<string, Framework[]> {
	const out: Record<string, Framework[]> = {};
	for (const slug of new Set(slugs)) out[slug] = frameworksFor(slug);
	return out;
}

/** Variant tables for a set of slugs — the detail page's data. */
export function variantsForAll(slugs: Iterable<string>): Record<string, FrameworkVariant[]> {
	const out: Record<string, FrameworkVariant[]> = {};
	for (const slug of new Set(slugs)) out[slug] = variantsFor(slug);
	return out;
}
