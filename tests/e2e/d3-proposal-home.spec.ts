import { expect, test } from "@playwright/test";

test.describe("proposal home", () => {
	test("lists the six jobs and every link resolves", async ({ page, request }) => {
		test.setTimeout(180000);
		await page.goto("/_proposals/home");
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
		await expect(page.locator("[data-testid=jobs] section")).toHaveCount(6);
		const hrefs = await page
			.locator("[data-testid=jobs] a")
			.evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute("href")!));
		expect(hrefs.length).toBeGreaterThan(30);
		for (const href of hrefs) {
			const res = await request.get(href);
			expect(res.status(), href).toBe(200);
		}
	});

	test("ranks the exact name first", async ({ page }) => {
		await page.goto("/_proposals/home");
		// Retry the fill: in dev the first keystrokes can land before hydration.
		await expect(async () => {
			await page.getByRole("searchbox").fill("tabs");
			await expect(page.locator("[data-testid=results] li").first()).toContainText("Tabs", {
				timeout: 1500,
			});
		}).toPass({ timeout: 20000 });
	});

	test("shows three suggestions when nothing matches, and they work", async ({ page }) => {
		await page.goto("/_proposals/home");
		const box = page.locator("[data-testid=no-results]");
		await expect(async () => {
			await page.getByRole("searchbox").fill("zzzzqq");
			await expect(box).toBeVisible({ timeout: 1500 });
		}).toPass({ timeout: 20000 });
		await expect(box.getByRole("button")).toHaveCount(3);
		await box.getByRole("button").first().click();
		await expect(page.locator("[data-testid=results] li").first()).toBeVisible();
	});

	test("is noindex and has no horizontal scroll on a phone", async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 700 });
		await page.goto("/_proposals/home");
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth > document.documentElement.clientWidth
		);
		expect(overflow).toBe(false);
	});
});
