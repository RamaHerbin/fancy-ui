/**
 * Component slugs from the prerendered sitemap: a few KB fetched on demand,
 * instead of bundling the whole component registry into the 404 page.
 */
export function slugsFromSitemap(xml: string): string[] {
	return [...xml.matchAll(/\/docs\/components\/([a-z0-9-]+)<\/loc>/g)].map((m) => m[1]!);
}
