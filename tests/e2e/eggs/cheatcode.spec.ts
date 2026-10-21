import { expect, test } from "@playwright/test";
import { hydratedHome, pressCheatCode, readEggs } from "./helpers";

test.describe("Easter egg: party mode", () => {
	// A cold dev server can spend most of the default 30 s on the first hydration.
	test.describe.configure({ timeout: 90_000 });

	test("the arrow-key code opens the party overlay, Escape closes it", async ({ page }) => {
		await page.goto("/");
		await hydratedHome(page);
		await pressCheatCode(page);
		const overlay = page.locator('[data-egg-overlay="cheatcode"]');
		await expect(overlay).toBeVisible({ timeout: 15_000 });
		await expect(overlay.locator("canvas")).toHaveCount(1);
		await expect(overlay.getByText(/Party mode/)).toBeVisible();
		await expect(page.locator("[data-egg-announcer]")).toContainText("Party mode");
		expect(await readEggs(page)).toContain("cheatcode");
		await page.keyboard.press("Escape");
		await expect(overlay).toHaveCount(0);
	});

	test("typing the code again while active toggles it off", async ({ page }) => {
		await page.goto("/");
		await hydratedHome(page);
		await pressCheatCode(page);
		const overlay = page.locator('[data-egg-overlay="cheatcode"]');
		await expect(overlay).toBeVisible({ timeout: 15_000 });
		await pressCheatCode(page);
		await expect(overlay).toHaveCount(0);
	});
});
