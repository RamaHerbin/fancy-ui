import { expect, test, type Page } from "@playwright/test";
import { hydratedHome, readEggs } from "./helpers";

/** Focus back on the document, away from any field (a click could land on a link). */
async function leaveFields(page: Page): Promise<void> {
	await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
}

test.describe("Glyph rain egg", () => {
	// The first visit on a cold dev server can spend most of the default 30 s hydrating.
	test.describe.configure({ timeout: 90_000 });

	test("typing the word opens the rain; Escape closes it", async ({ page }) => {
		await page.goto("/");
		await hydratedHome(page);
		await leaveFields(page);
		await page.keyboard.type("matrix");
		const overlay = page.locator('[data-egg-overlay="matrix"]');
		await expect(overlay.locator("[data-matrix-overlay]")).toBeVisible({ timeout: 15_000 });
		await expect(overlay.locator("[data-matrix-overlay] canvas")).toBeVisible();
		await expect(overlay.getByRole("button", { name: "Leave" })).toBeFocused();
		await page.keyboard.press("Escape");
		await expect(overlay).toHaveCount(0);
		expect(await readEggs(page)).toContain("matrix");
	});

	test("party mode replaced by the rain swaps the payload", async ({ page }) => {
		await page.goto("/");
		await hydratedHome(page);
		await page.evaluate(() => (window as unknown as { fancy: { party(): void } }).fancy.party());
		await expect(
			page.locator('[data-egg-overlay="cheatcode"]').getByText(/Party mode/)
		).toBeVisible({ timeout: 15_000 });
		await leaveFields(page);
		await page.keyboard.type("matrix");
		const overlay = page.locator('[data-egg-overlay="matrix"]');
		await expect(overlay.locator("[data-matrix-overlay]")).toBeVisible({ timeout: 15_000 });
		await expect(page.getByText(/Party mode/)).toHaveCount(0);
	});

	test("Tab out of the rain leaves the egg; Escape hands focus back", async ({ page }) => {
		await page.goto("/");
		await hydratedHome(page);
		const brand = page.locator("[data-egg='logo']").first();
		await brand.focus();
		await page.keyboard.type("matrix");
		const overlay = page.locator('[data-egg-overlay="matrix"]');
		await expect(overlay.getByRole("button", { name: "Leave" })).toBeFocused({ timeout: 15_000 });
		await page.keyboard.press("Escape");
		await expect(overlay).toHaveCount(0);
		await expect(brand).toBeFocused();

		await page.keyboard.type("matrix");
		await expect(overlay.getByRole("button", { name: "Leave" })).toBeFocused({ timeout: 15_000 });
		await page.keyboard.press("Tab");
		await expect(overlay).toHaveCount(0);
	});

	test("the Leave button closes it", async ({ page }) => {
		await page.goto("/");
		await hydratedHome(page);
		await leaveFields(page);
		await page.keyboard.type("matrix");
		const overlay = page.locator('[data-egg-overlay="matrix"]');
		await overlay.getByRole("button", { name: "Leave" }).click();
		await expect(overlay).toHaveCount(0);
	});

	test("typing the word in the hero searchbox does nothing", async ({ page }) => {
		await page.goto("/");
		await hydratedHome(page);
		await page.getByRole("main").getByRole("search").getByRole("searchbox").focus();
		await page.keyboard.type("matrix");
		await expect(page.locator('[data-egg-overlay="matrix"]')).toHaveCount(0);
		expect(await readEggs(page)).not.toContain("matrix");
	});
});
