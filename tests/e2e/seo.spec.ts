import { expect, test, type APIRequestContext } from "@playwright/test";
import { routeGithubApi } from "./_helpers/console-guard";

/** Every `<loc>` of the generated sitemap, as a path. */
async function sitemapPaths(request: APIRequestContext): Promise<string[]> {
	const res = await request.get("/sitemap.xml");
	expect(res.status()).toBe(200);
	const xml = await res.text();
	return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname);
}

/** Status after at most one redirect hop. */
async function statusWithinOneHop(request: APIRequestContext, path: string): Promise<number> {
	const first = await request.get(path, { maxRedirects: 0 });
	if (first.status() < 300 || first.status() >= 400) return first.status();
	const location = first.headers()["location"];
	if (!location) return first.status();
	const second = await request.get(new URL(location, "http://localhost").pathname, {
		maxRedirects: 0,
	});
	return second.status();
}

/** Deterministic spread over a list: every n-th entry, so the sample is stable between runs. */
function sample<T>(items: T[], count: number): T[] {
	const stride = Math.max(1, Math.floor(items.length / count));
	return items.filter((_, i) => i % stride === 0).slice(0, count);
}

const isComponent = (p: string) => /^\/docs\/components\/.+/.test(p);
const isRecipe = (p: string) => /^\/docs\/recipes\/.+/.test(p);
const isReference = (p: string) => /^\/inspiration\/.+/.test(p);

test.describe("sitemap URLs", () => {
	test("the sitemap lists the static pages and the component pages", async ({ request }) => {
		const paths = await sitemapPaths(request);
		expect(paths).toContain("/");
		expect(paths).toContain("/docs/components");
		expect(paths.filter(isComponent).length).toBeGreaterThan(50);
	});

	test("every static sitemap URL responds 200 in at most one hop", async ({ request }) => {
		const statics = (await sitemapPaths(request)).filter(
			(p) => !isComponent(p) && !isRecipe(p) && !isReference(p)
		);
		expect(statics.length).toBeGreaterThan(5);
		for (const path of statics) {
			expect(await statusWithinOneHop(request, path), path).toBe(200);
		}
	});

	test("ten sampled component pages respond 200 in at most one hop", async ({ request }) => {
		const picked = sample((await sitemapPaths(request)).filter(isComponent), 10);
		expect(picked).toHaveLength(10);
		for (const path of picked) {
			expect(await statusWithinOneHop(request, path), path).toBe(200);
		}
	});

	test("recipe pages and a sample of references respond 200 in at most one hop", async ({
		request,
	}) => {
		const paths = await sitemapPaths(request);
		const targets = [...paths.filter(isRecipe), ...sample(paths.filter(isReference), 3)];
		expect(targets.length).toBeGreaterThan(0);
		for (const path of targets) {
			expect(await statusWithinOneHop(request, path), path).toBe(200);
		}
	});
});

test.describe("indexing", () => {
	test.beforeEach(async ({ page }) => {
		await routeGithubApi(page);
	});

	test("/skins asks crawlers not to index it", async ({ page }) => {
		await page.goto("/skins");
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
	});

	test("a component page stays indexable", async ({ page }) => {
		await page.goto("/docs/components/button");
		await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
		await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
	});
});
