import { expect, test } from "@playwright/test";
import { hydratedHome, readEggs } from "./helpers";

test.describe("Logo egg", () => {
	// A cold dev server can spend most of the default 30 s on the first hydration.
	test.describe.configure({ timeout: 90_000 });

	test("seven quick clicks on the brand spark chain into party mode", async ({ page }) => {
		await page.goto("/");
		await hydratedHome(page);
		const brand = page.locator("[data-egg='logo']").first();
		// Each click navigates to "/" (same page); the runtime's counts survive it.
		for (let i = 0; i < 7; i++) {
			await brand.click();
			await page.waitForTimeout(50);
		}
		await expect(page.locator("[data-egg-overlay='logo']")).toBeVisible({ timeout: 15_000 });
		await expect(page.locator("[data-egg-overlay='logo'] [data-logo-burst]")).toBeVisible();
		// Assert the party payload itself, not only the host attribute: the host
		// once kept the old payload mounted when one egg replaced another.
		const party = page.locator("[data-egg-overlay='cheatcode']");
		await expect(party.getByText(/Party mode/)).toBeVisible({ timeout: 5000 });
		await expect(party.locator("canvas")).toHaveCount(1);
		await expect(page.locator("[data-logo-burst]")).toHaveCount(0);
		const found = await readEggs(page);
		expect(found).toContain("logo");
		expect(found).toContain("cheatcode");
	});

	test("six clicks are not enough", async ({ page }) => {
		await page.goto("/");
		await hydratedHome(page);
		const brand = page.locator("[data-egg='logo']").first();
		for (let i = 0; i < 6; i++) {
			await brand.click();
			await page.waitForTimeout(50);
		}
		await page.waitForTimeout(300);
		await expect(page.locator("[data-egg-overlay]")).toHaveCount(0);
		expect(await readEggs(page)).not.toContain("logo");
	});
});
