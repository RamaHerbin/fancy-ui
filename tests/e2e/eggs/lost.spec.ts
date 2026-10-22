import { expect, test, type Page } from "@playwright/test";
import { readEggs } from "./helpers";

/** The payload mounts after hydration; until then the link points at the index. */
async function teleportReady(page: Page) {
	const link = page.locator('[data-egg="teleport"]');
	await expect(link).toBeVisible({ timeout: 30_000 });
	await expect
		.poll(() => link.getAttribute("href"), { timeout: 30_000 })
		.toMatch(/\/docs\/components\/[a-z0-9-]+$/);
	return link;
}

test.describe("Egg: lost in space", () => {
	// A cold dev server compiles the docs chrome on the first 404 under /docs.
	test.describe.configure({ timeout: 90_000 });

	test("the 404 page teleports to a random component and records the find", async ({ page }) => {
		const res = await page.goto("/this-page-does-not-exist");
		expect(res?.status()).toBe(404);
		const link = await teleportReady(page);
		await expect(page.locator("[data-egg-count]")).toHaveText(/\d+ \/ \d+ secrets found/);
		await link.click();
		await expect(page).toHaveURL(/\/docs\/components\/[a-z0-9-]+$/, { timeout: 20_000 });
		await expect.poll(() => readEggs(page)).toContain("lost");
	});

	test("an unknown component slug is a 404 with the teleport link in the docs chrome", async ({
		page,
	}) => {
		const res = await page.goto("/docs/components/not-a-component");
		expect(res?.status()).toBe(404);
		await teleportReady(page);
		await expect(page.locator('[data-error-variant="404"]')).toBeVisible();
	});
});
