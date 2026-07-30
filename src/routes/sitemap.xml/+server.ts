import { getAllComponents } from "$lib/fancy-ui/registry.js";
import { SITE_URL } from "$lib/site.js";
import type { RequestHandler } from "./$types";

export const prerender = true;

/**
 * Hand-listed because the prerenderer does not crawl (see svelte.config.js) —
 * /docs and /docs/getting-started are redirects and stay out.
 */
const STATIC_PATHS = [
	"/",
	"/docs/components",
	"/docs/getting-started/introduction",
	"/docs/getting-started/installation",
	"/docs/getting-started/theming",
	"/docs/getting-started/theme-generator",
	"/docs/getting-started/changelog",
];

export const GET: RequestHandler = () => {
	const paths = [
		...STATIC_PATHS,
		...getAllComponents().map(({ slug }) => `/docs/components/${slug}`),
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
