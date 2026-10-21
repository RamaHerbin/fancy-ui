import { expect, test } from "@playwright/test";

// The filters are client state, so interactions wait for the page's modules to
// finish loading (hydration) rather than racing the prerendered HTML.
async function hydrated(page: import("@playwright/test").Page) {
	await page.waitForLoadState("networkidle");
}

test.describe("Components gallery", () => {
	test("groups components into category sections the TOC can list", async ({ page }) => {
		await page.goto("/docs/components");
		await hydrated(page);

		await expect(page.locator("section#buttons h2")).toBeVisible();
		// Card names carry data-toc-ignore, so the rail lists categories, not 140+ components.
		const tocLinks = page.locator(".docs-toc a");
		await expect(tocLinks.first()).toBeAttached();
		expect(await tocLinks.count()).toBeLessThan(25);
	});

	test("shows a captured thumbnail on a card", async ({ page }) => {
		await page.goto("/docs/components");
		await hydrated(page);

		const card = page.locator('main a.component-card[href="/docs/components/rainbow-button"]');
		await expect(card.locator("img").first()).toHaveAttribute(
			"src",
			/\/thumbs\/(light|dark)\/rainbow-button\.webp$/
		);
	});

	test("search and group filters round-trip through the URL", async ({ page }) => {
		await page.goto("/docs/components");
		await hydrated(page);

		await page.keyboard.press("/");
		await expect(page.getByRole("searchbox")).toBeFocused();
		await page.keyboard.type("beam");
		await page.getByRole("radio", { name: /fancy/i }).click();

		await expect(page).toHaveURL(/[?&]q=beam/);
		await expect(page).toHaveURL(/[?&]group=fancy/);
		await expect(
			page.locator('main a.component-card[href="/docs/components/border-beam"]')
		).toBeVisible();
		await expect(
			page.locator('main a.component-card[href="/docs/components/button"]')
		).toBeHidden();

		await page.reload();
		await expect(page.getByRole("searchbox")).toHaveValue("beam");
		await expect(page.getByRole("radio", { name: /fancy/i })).toHaveAttribute(
			"aria-checked",
			"true"
		);

		await page
			.getByRole("button", { name: /clear filters/i })
			.first()
			.click();
		await expect(page).not.toHaveURL(/[?&]q=/);
		await expect(
			page.locator('main a.component-card[href="/docs/components/button"]')
		).toBeVisible();
	});

	test("an empty result offers a way back", async ({ page }) => {
		await page.goto("/docs/components");
		await hydrated(page);

		await page.getByRole("searchbox").fill("zzzz-no-such-component");
		await expect(page.getByText(/no components match/i)).toBeVisible();
		await page
			.getByRole("button", { name: /clear filters/i })
			.last()
			.click();
		await expect(page.locator("section#buttons")).toBeVisible();
	});
});

test.describe("Components gallery: discovery", () => {
	test("browse by job lists six jobs above the categories and no link is dead", async ({
		page,
		request,
	}) => {
		test.setTimeout(180000);
		await page.goto("/docs/components");
		await hydrated(page);

		await expect(page.locator("[data-jobs] [data-job]")).toHaveCount(6);
		const jobsBox = await page.locator("[data-jobs]").boundingBox();
		const firstSection = await page.locator("section#buttons").boundingBox();
		expect(jobsBox!.y).toBeLessThan(firstSection!.y);

		const hrefs = await page
			.locator("[data-jobs] a")
			.evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute("href")!));
		expect(hrefs.length).toBeGreaterThanOrEqual(36);
		for (const href of hrefs) {
			const res = await request.get(href);
			expect(res.status(), href).toBe(200);
		}
	});

	test("the jobs section fits a phone", async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 700 });
		await page.goto("/docs/components");
		await hydrated(page);
		await expect(page.locator("[data-jobs]")).toBeVisible();
		// Scoped to the section: the docs header has its own width on a phone.
		const widest = await page.evaluate(() =>
			Math.max(
				...Array.from(document.querySelectorAll("[data-jobs], [data-jobs] *")).map(
					(el) => el.getBoundingClientRect().right
				)
			)
		);
		expect(widest).toBeLessThanOrEqual(375);
	});

	test("the command search ranks the exact name first", async ({ page }) => {
		await page.goto("/docs/components");
		await hydrated(page);
		await page.keyboard.press("Control+k");
		const input = page.getByPlaceholder(/search components/i);
		await input.fill("button");
		await expect(page.locator("[data-result]").first()).toContainText("Button");
		await expect(page.locator("[data-result]").first()).not.toContainText("Rainbow");
	});

	test("the command search offers three suggestions when nothing matches, and they work", async ({
		page,
	}) => {
		await page.goto("/docs/components");
		await hydrated(page);
		await page.keyboard.press("Control+k");
		await page.getByPlaceholder(/search components/i).fill("zzzzqq");
		const box = page.locator("[data-testid=search-no-results]");
		await expect(box).toBeVisible();
		await expect(box.getByRole("button")).toHaveCount(3);
		await box.getByRole("button").first().click();
		await expect(page.locator("[data-result]").first()).toBeVisible();
	});
});
