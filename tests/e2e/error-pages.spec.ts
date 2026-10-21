import { expect, test } from "@playwright/test";

test.describe("Error pages", () => {
	test("a docs 404 keeps the sidebar and a working search", async ({ page }) => {
		const res = await page.goto("/docs/components/nope");
		expect(res?.status()).toBe(404);
		await page.waitForLoadState("networkidle");
		await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
		await expect(page.locator("a[href='/docs/components']").first()).toBeAttached();
		await expect(
			page.locator("a[href='/docs/getting-started/introduction']").first()
		).toBeAttached();
		await page.getByRole("button", { name: "Search the docs" }).first().click();
		await expect(page.getByPlaceholder(/search/i).first()).toBeVisible();
	});

	test("a root 404 renders the shared body without docs chrome", async ({ page }) => {
		const res = await page.goto("/nope");
		expect(res?.status()).toBe(404);
		await page.waitForLoadState("networkidle");
		await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
		await expect(page.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
		await expect(page.getByRole("link", { name: "Report a broken link" })).toHaveAttribute(
			"href",
			/issues\/new/
		);
		await expect(page.locator("aside")).toHaveCount(0);
		await page.getByRole("button", { name: "Search the docs" }).first().click();
		await expect(page.getByPlaceholder(/search/i).first()).toBeVisible();
	});

	test("/skins is noindex and has no canonical", async ({ page }) => {
		await page.goto("/skins");
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
		await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
	});
});
