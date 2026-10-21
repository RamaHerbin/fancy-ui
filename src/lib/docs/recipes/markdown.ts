/**
 * Source loading and the Markdown rendering of a recipe. Isomorphic: the page
 * route reads `recipeSources` for its code tabs, the `.md` endpoint and the
 * LLM surface read `recipeMarkdown`.
 *
 * Sources are read as raw text and never bundled. The React and Vue ones live
 * in each package's `docs-examples/recipes/` sub-folder, where the package's
 * own `check` type-checks them against the real barrel.
 */

import { toConsumerImports } from "$lib/docs/code.js";
import { SITE_URL } from "$lib/site.js";
import { getComponent } from "$lib/fancy-ui/registry.js";
import { recipeUrl, type Recipe } from "./registry.js";

export interface RecipeSources {
	svelte: string;
	react: string;
	vue: string;
}

const svelteSources = import.meta.glob("/src/lib/components/docs/recipes/*/Demo.svelte", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

const reactSources = import.meta.glob("/react/docs-examples/recipes/*.tsx", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

const vueSources = import.meta.glob("/vue/docs-examples/recipes/*.vue", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

/** The compiled source of a recipe in each framework, Svelte rewritten to consumer imports. */
export function recipeSources(slug: string): RecipeSources {
	return {
		svelte: toConsumerImports(
			(svelteSources[`/src/lib/components/docs/recipes/${slug}/Demo.svelte`] ?? "").trim()
		),
		react: (reactSources[`/react/docs-examples/recipes/${slug}.tsx`] ?? "").trim(),
		vue: (vueSources[`/vue/docs-examples/recipes/${slug}.vue`] ?? "").trim(),
	};
}

/** The recipe as a Markdown page, for agents and for "copy as Markdown". */
export function recipeMarkdown(recipe: Recipe): string {
	const sources = recipeSources(recipe.slug);
	const lines: string[] = [
		`# ${recipe.title}`,
		"",
		`> ${recipe.summary}`,
		"",
		`- Docs: ${recipeUrl(recipe.slug)}`,
		"",
		"## Components",
		"",
	];
	for (const slug of recipe.components) {
		const component = getComponent(slug);
		const name = component?.name ?? slug;
		lines.push(`- [${name}](${SITE_URL}/docs/components/${slug}.md)`);
	}
	lines.push("", "## Steps", "");
	recipe.steps.forEach((step, index) => lines.push(`${index + 1}. ${step}`));
	lines.push("", "## Pitfalls", "");
	for (const pitfall of recipe.pitfalls) lines.push(`- ${pitfall}`);
	lines.push(
		"",
		"## Svelte",
		"",
		"```svelte",
		sources.svelte,
		"```",
		"",
		"## React",
		"",
		"```tsx",
		sources.react,
		"```",
		"",
		"## Vue",
		"",
		"```vue",
		sources.vue,
		"```",
		""
	);
	return lines.join("\n");
}
