import { expect, test, type APIRequestContext } from "@playwright/test";

// Not imported from the registry: it pulls build-time globals that Playwright's loader lacks.
const RECIPES = [
	{ slug: "save-publish", title: "Save and publish" },
	{ slug: "undo-toast", title: "Undo with a toast" },
];

const INTRO = "/docs/getting-started/introduction";

/** Follow redirects by hand so the number of hops can be asserted. */
async function hops(request: APIRequestContext, start: string) {
	let url = start;
	const chain: { url: string; status: number }[] = [];
	for (let i = 0; i < 6; i++) {
		const res = await request.get(url, { maxRedirects: 0 });
		chain.push({ url, status: res.status() });
		const loc = res.headers()["location"];
		if (res.status() < 300 || res.status() >= 400 || !loc) break;
		url = new URL(loc, "http://localhost").pathname;
	}
	return chain;
}

test.describe("routing", () => {
	for (const from of ["/docs", "/docs/getting-started", "/demo"]) {
		test(`${from} reaches the introduction in one hop`, async ({ request }) => {
			const chain = await hops(request, from);
			expect(chain).toHaveLength(2);
			expect(chain[0].status).toBe(308);
			expect(chain[1]).toEqual({ url: INTRO, status: 200 });
		});
	}

	test("/demo/button redirects to the component page", async ({ request }) => {
		const chain = await hops(request, "/demo/button");
		expect(chain[0].status).toBe(308);
		expect(chain[1]).toEqual({ url: "/docs/components/button", status: 200 });
	});

	test("/docs/recipes responds 200 and lists every recipe", async ({ page }) => {
		const res = await page.goto("/docs/recipes");
		expect(res?.status()).toBe(200);
		for (const { slug, title } of RECIPES) {
			const card = page.locator(`main li[data-recipe="${slug}"]`);
			await expect(card).toBeVisible();
			await expect(card).toContainText(title);
		}
		// A recipe added later must show up too: the card count follows the sitemap.
		const sitemap = await (await page.request.get("/sitemap.xml")).text();
		const listed = (sitemap.match(/\/docs\/recipes\/[a-z0-9-]+</g) ?? []).length;
		await expect(page.locator("main li[data-recipe]")).toHaveCount(listed);
	});
});
