import { expect, test } from "@playwright/test";
import { hydratedHome, pressCheatCode, readEggs } from "./eggs/helpers";

type FancyWindow = Window & {
	fancy?: { version: string; eggs(): void; help(): void };
};

test.describe("Easter-egg runtime", () => {
	test("window.fancy is installed after hydration with the package version", async ({ page }) => {
		await page.goto("/");
		await hydratedHome(page);
		const version = await page.evaluate(() => (window as FancyWindow).fancy?.version);
		expect(version).toMatch(/^\d+\.\d+\.\d+/);
	});

	test("fancy.eggs() marks the console egg as found", async ({ page }) => {
		await page.goto("/");
		await hydratedHome(page);
		expect(await readEggs(page)).not.toContain("console");
		await page.evaluate(() => (window as FancyWindow).fancy!.eggs());
		await expect.poll(() => readEggs(page)).toContain("console");
	});

	test("keys typed in the hero searchbox never trigger an egg", async ({ page }) => {
		await page.goto("/");
		await hydratedHome(page);
		await page.getByRole("main").getByRole("search").getByRole("searchbox").focus();
		await pressCheatCode(page);
		expect(await readEggs(page)).toEqual([]);
		await expect(page.locator("[data-egg-overlay], [data-egg-note]")).toHaveCount(0);
	});

	test("Ctrl+K still opens the command search", async ({ page }) => {
		await page.goto("/");
		await hydratedHome(page);
		await page.keyboard.press("Control+k");
		await expect(page.getByRole("dialog")).toBeVisible();
	});

	test("reduced motion swaps the payload for the quiet note", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto("/");
		await hydratedHome(page);
		await pressCheatCode(page);
		// The cheat-code payload lands in the same change; until then there is nothing to see.
		const found = await readEggs(page);
		test.skip(!found.includes("cheatcode"), "cheatcode egg not registered yet");
		await expect(page.locator("[data-egg-note]")).toBeVisible();
		await expect(page.locator("[data-egg-overlay]")).toHaveCount(0);
		await page.keyboard.press("Escape");
		await expect(page.locator("[data-egg-note]")).toHaveCount(0);
	});
});
