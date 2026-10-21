/**
 * Consumer snippets for the React and Vue editions of a component. The
 * sources live next to each package (`react/docs-examples`, `vue/docs-examples`)
 * where the package's own `check` script type-checks them against the real
 * barrel, so what the docs print has compiled. They are read here as raw text
 * and never bundled.
 *
 * Svelte is not served from here: its examples are the live demos under
 * `components/docs/examples`, rewritten to consumer imports by `code.ts`.
 * A component without a snippet returns null, and the page says so instead of
 * showing another framework's code.
 */

import type { Framework } from "$lib/inspiration/types.js";

export type SnippetLang = "tsx" | "vue";

export interface FrameworkSnippet {
	code: string;
	lang: SnippetLang;
}

const reactSources = import.meta.glob("/react/docs-examples/*.tsx", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

const vueSources = import.meta.glob("/vue/docs-examples/*.vue", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

function bySlug(sources: Record<string, string>): Map<string, string> {
	const out = new Map<string, string>();
	for (const [path, source] of Object.entries(sources)) {
		const slug = path.slice(path.lastIndexOf("/") + 1).replace(/\.[^.]+$/, "");
		out.set(slug, source.trim());
	}
	return out;
}

const SNIPPETS: Record<
	Exclude<Framework, "svelte">,
	{ lang: SnippetLang; map: Map<string, string> }
> = {
	react: { lang: "tsx", map: bySlug(reactSources) },
	vue: { lang: "vue", map: bySlug(vueSources) },
};

/** The React or Vue example for a component, or null (always null for Svelte). */
export function getUsageSnippet(slug: string, framework: Framework): FrameworkSnippet | null {
	if (framework === "svelte") return null;
	const { lang, map } = SNIPPETS[framework];
	const code = map.get(slug);
	return code ? { code, lang } : null;
}

/** Slugs that have a snippet in the given framework. */
export function snippetSlugs(framework: Framework): string[] {
	return framework === "svelte" ? [] : [...SNIPPETS[framework].map.keys()].sort();
}
