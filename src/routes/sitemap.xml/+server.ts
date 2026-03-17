import { getAllComponents } from "$lib/fancy-ui/registry.js";

const SITE_URL = "https://fancy-ui.rama.app";

export async function GET() {
	const components = getAllComponents().filter((c) => c.status === "done");

	const staticRoutes = [
		{ url: SITE_URL, priority: "1.0", changefreq: "weekly" },
		{ url: `${SITE_URL}/demo`, priority: "0.9", changefreq: "weekly" },
	];

	const componentRoutes = components.map((c) => ({
		url: `${SITE_URL}/demo/${c.slug}`,
		priority: "0.7",
		changefreq: "monthly",
	}));

	const allRoutes = [...staticRoutes, ...componentRoutes];

	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes
	.map(
		(route) => `  <url>
    <loc>${route.url}</loc>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`
	)
	.join("\n")}
</urlset>`;

	return new Response(sitemap, {
		headers: {
			"Content-Type": "application/xml",
			"Cache-Control": "max-age=3600",
		},
	});
}
