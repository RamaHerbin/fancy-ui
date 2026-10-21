/**
 * Docs route -> repository source path, for the "Edit this page" link.
 * Returns null for any route that has no single source to point at.
 */
import { getComponent } from "$lib/fancy-ui/registry.js";
import { recipesRegistry } from "./recipes/registry.js";

const GETTING_STARTED_SOURCES: Record<string, string> = {
	introduction: "src/lib/components/docs/IntroductionPage.svelte",
	installation: "src/lib/components/docs/InstallationPage.svelte",
	theming: "src/lib/components/docs/ThemingPage.svelte",
	"theme-generator": "src/routes/docs/getting-started/theme-generator/+page.svelte",
	changelog: "src/lib/components/docs/ChangelogPage.svelte",
};

const RECIPES_SOURCE = "src/lib/docs/recipes/registry.ts";

export function sourcePathForRoute(pathname: string): string | null {
	const match = /^\/docs\/(getting-started|recipes|components)\/([^/]+)\/?$/.exec(pathname);
	if (!match) return null;
	const [, section, slug] = match;
	if (section === "getting-started") {
		return Object.hasOwn(GETTING_STARTED_SOURCES, slug) ? GETTING_STARTED_SOURCES[slug] : null;
	}
	if (section === "recipes") {
		return recipesRegistry.some((r) => r.slug === slug) ? RECIPES_SOURCE : null;
	}
	return getComponent(slug) ? `src/lib/fancy-ui/${slug}` : null;
}
