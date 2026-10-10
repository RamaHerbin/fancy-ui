import { getAllComponents } from "$lib/fancy-ui/registry.js";
import { publishedSlugs } from "$lib/inspiration/catalog.js";
import { SITE_URL } from "$lib/site.js";
import type { RequestHandler } from "./$types";

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
	"/inspiration",
	"/docs/getting-started/introduction",
	"/docs/getting-started/installation",
	"/docs/getting-started/theming",
	"/docs/getting-started/theme-generator",
	"/docs/getting-started/changelog",
];

// No <lastmod>: a registry edit touches every component page at once, so any
// date we could derive collapses to the same value everywhere — an unreliable
// lastmod is worse than none, since crawlers learn to ignore it.
export const GET: RequestHandler = () => {
	const paths = [
		...STATIC_PATHS,
		...getAllComponents().map(({ slug }) => `/docs/components/${slug}`),
		// Only published references: drafts and archived entries never get a URL.
		...publishedSlugs().map((slug) => `/inspiration/${slug}`),
	];

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((path) => `\t<url><loc>${SITE_URL}${path}</loc></url>`).join("\n")}
</urlset>
`;

	return new Response(body, {
		headers: { "Content-Type": "application/xml; charset=utf-8" },
	});
};
