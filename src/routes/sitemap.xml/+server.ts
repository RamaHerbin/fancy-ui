import { getAllRecipes } from "$lib/docs/recipes/registry.js";
import { getAllComponents } from "$lib/fancy-ui/registry.js";
import { publishedSlugs } from "$lib/inspiration/catalog.js";
import { SITE_URL } from "$lib/site.js";
import generated from "$lib/generated/sitemap-lastmod.json";
import type { RequestHandler } from "./$types";

/** Shape of scripts/build-sitemap-lastmod.mjs's output; dates are YYYY-MM-DD. */
interface Lastmod {
	static: Record<string, string>;
	components: Record<string, string>;
	recipes: string | null;
	inspiration: Record<string, string>;
}

const lastmod: Lastmod = generated;

export const prerender = true;

/**
 * Hand-listed because the prerenderer does not crawl (see svelte.config.js) —
 * /docs and /docs/getting-started are redirects and stay out, as are /finds
 * (301 → /inspiration), /inspiration/saved (per-browser, noindex) and every
 * filtered /inspiration?… URL (the canonical is the unfiltered gallery).
 */
const STATIC_PATHS = [
	"/",
	"/docs/components",
	"/docs/recipes",
	"/inspiration",
	"/docs/getting-started/introduction",
	"/docs/getting-started/installation",
	"/docs/getting-started/theming",
	"/docs/getting-started/theme-generator",
	"/docs/getting-started/changelog",
];

/**
 * `<lastmod>` comes from the committed `sitemap-lastmod.json` (per page, from
 * git history — see scripts/build-sitemap-lastmod.mjs), never from the build:
 * a date that moved on every deploy would teach crawlers to ignore it. A URL
 * without a known date simply has no `<lastmod>`.
 */
type Entry = { path: string; lastmod?: string | null };

function url({ path, lastmod: date }: Entry): string {
	const loc = `<loc>${SITE_URL}${path}</loc>`;
	return date ? `\t<url>${loc}<lastmod>${date}</lastmod></url>` : `\t<url>${loc}</url>`;
}

export const GET: RequestHandler = () => {
	const entries: Entry[] = [
		...STATIC_PATHS.map((path) => ({ path, lastmod: lastmod.static[path] })),
		// Deprecated components keep their page but leave the sitemap.
		...getAllComponents()
			.filter(({ deprecated }) => !deprecated)
			.map(({ slug }) => ({
				path: `/docs/components/${slug}`,
				lastmod: lastmod.components[slug],
			})),
		...getAllRecipes().map(({ slug }) => ({
			path: `/docs/recipes/${slug}`,
			lastmod: lastmod.recipes,
		})),
		// Only published references: drafts and archived entries never get a URL.
		...publishedSlugs().map((slug) => ({
			path: `/inspiration/${slug}`,
			lastmod: lastmod.inspiration[slug],
		})),
	];

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(url).join("\n")}
</urlset>
`;

	return new Response(body, {
		headers: { "Content-Type": "application/xml; charset=utf-8" },
	});
};
